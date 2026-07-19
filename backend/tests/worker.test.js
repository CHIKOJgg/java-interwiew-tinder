import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';

// ─── Mocks (must be before import) ──────────────────────────────────────
vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn().mockResolvedValue({ query: vi.fn(), release: vi.fn() }),
    end: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../src/services/aiService.js', () => ({
  generateExplanation: vi.fn(),
  generateTestOptions: vi.fn(),
  generateBuggyCode: vi.fn(),
  generateBlitzStatement: vi.fn(),
  generateCodeCompletion: vi.fn(),
}));

vi.mock('../src/services/queueService.js', () => ({
  initQueueTable: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/services/billing/starsService.js', () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@sentry/node', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  init: vi.fn(),
}));

vi.mock('node-cron', () => ({
  default: { schedule: vi.fn() },
  schedule: vi.fn(),
}));

// Stub process.exit / process.on so the auto-start guard and shutdown don't
// actually kill the test runner.
vi.spyOn(process, 'exit').mockImplementation(() => {});
vi.spyOn(process, 'on').mockImplementation(() => {});

const { default: pool } = await import('../src/config/database.js');
const { sendTelegramMessage } = await import('../src/services/billing/starsService.js');
const Sentry = await import('@sentry/node');
const cron = (await import('node-cron')).default;
const ai = await import('../src/services/aiService.js');
const {
  processJob, BACKFILL, notifyExpiring, processExpired, verifyBackupIntegrity,
  appLink, notifyStreakReminders, scheduleSubscriptionJobs, runWorker, shutdown,
} = await import('../src/worker.js');

beforeEach(() => {
  vi.clearAllMocks();
  pool.query.mockResolvedValue({ rows: [] });
  pool.connect.mockResolvedValue({ query: vi.fn(), release: vi.fn() });
  sendTelegramMessage.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('worker — appLink', () => {
  it('returns a link when BOT_USERNAME is set', () => {
    const prev = process.env.BOT_USERNAME;
    process.env.BOT_USERNAME = 'mybot';
    expect(appLink()).toBe('\n👇 https://t.me/mybot/app');
    if (prev === undefined) delete process.env.BOT_USERNAME; else process.env.BOT_USERNAME = prev;
  });

  it('returns empty string when BOT_USERNAME is not set', () => {
    const prev = process.env.BOT_USERNAME;
    delete process.env.BOT_USERNAME;
    expect(appLink()).toBe('');
    if (prev !== undefined) process.env.BOT_USERNAME = prev;
  });
});

describe('worker — processJob', () => {
  const makeJob = (task_type, payload) => ({ id: 1, task_type, payload });

  it('dispatches explanation task', async () => {
    ai.generateExplanation.mockResolvedValue('EXPL');
    await processJob(makeJob('explanation', { questionText: 'q', shortAnswer: 'a', questionId: 5 }));
    expect(ai.generateExplanation).toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("status='completed'"), [1]);
  });

  it('parses string payloads', async () => {
    ai.generateTestOptions.mockResolvedValue([{ text: 'x' }]);
    await processJob(makeJob('test', JSON.stringify({ questionText: 'q', shortAnswer: 'a', questionId: 7 })));
    expect(ai.generateTestOptions).toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("status='completed'"), [1]);
  });

  it('handles unknown task type', async () => {
    await processJob(makeJob('frobnicate', { questionId: 1 }));
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("status='completed'"), [1]);
  });

  it('marks job failed on AI error and records message', async () => {
    ai.generateExplanation.mockRejectedValue(new Error('boom'));
    await processJob(makeJob('explanation', { questionText: 'q', questionId: 3 }));
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("status='failed'"), [1, 'boom']);
  });

  it('backfills explanation when result and qId present', async () => {
    ai.generateExplanation.mockResolvedValue('EXPL');
    await processJob(makeJob('explanation', { questionText: 'q', shortAnswer: 'a', questionId: 9 }));
    expect(BACKFILL).toBeTruthy();
    expect(pool.query).toHaveBeenCalledWith('UPDATE questions SET cached_explanation=$1 WHERE id=$2', ['EXPL', 9]);
  });

  it.each(['test', 'bug', 'blitz', 'code'])('dispatches %s task', async (type) => {
    const fnMap = {
      test: ai.generateTestOptions, bug: ai.generateBuggyCode,
      blitz: ai.generateBlitzStatement, code: ai.generateCodeCompletion,
    };
    fnMap[type].mockResolvedValue({ foo: 'bar' });
    await processJob(makeJob(type, { questionText: 'q', category: 'c', questionId: 2 }));
    expect(fnMap[type]).toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("status='completed'"), [1]);
  });
});

describe('worker — BACKFILL guards', () => {
  it('test backfill skips empty options array', async () => {
    const q = vi.fn().mockResolvedValue(undefined);
    const orig = pool.query;
    pool.query = q;
    await BACKFILL.test(5, []);
    expect(q).not.toHaveBeenCalled();
    pool.query = orig;
  });

  it('test backfill writes non-empty options', async () => {
    const q = vi.fn().mockResolvedValue(undefined);
    const orig = pool.query;
    pool.query = q;
    await BACKFILL.test(5, [{ text: 'a' }]);
    expect(q).toHaveBeenCalledWith('UPDATE questions SET options=$1 WHERE id=$2', [JSON.stringify([{ text: 'a' }]), 5]);
    pool.query = orig;
  });

  it('bug backfill skips incomplete result', async () => {
    const q = vi.fn().mockResolvedValue(undefined);
    const orig = pool.query;
    pool.query = q;
    await BACKFILL.bug(5, { code: 'x' }); // missing bug/options
    expect(q).not.toHaveBeenCalled();
    pool.query = orig;
  });

  it('bug backfill writes complete result', async () => {
    const q = vi.fn().mockResolvedValue(undefined);
    const orig = pool.query;
    pool.query = q;
    const full = { code: 'x', bug: 'y', options: [{ text: 'z' }] };
    await BACKFILL.bug(5, full);
    expect(q).toHaveBeenCalledWith('UPDATE questions SET bug_hunting_data=$1 WHERE id=$2', [JSON.stringify(full), 5]);
    pool.query = orig;
  });

  it('code backfill skips incomplete result', async () => {
    const q = vi.fn().mockResolvedValue(undefined);
    const orig = pool.query;
    pool.query = q;
    await BACKFILL.code(5, { snippet: 'x' }); // missing correctPart/options
    expect(q).not.toHaveBeenCalled();
    pool.query = orig;
  });

  it('blitz backfill always writes', async () => {
    const q = vi.fn().mockResolvedValue(undefined);
    const orig = pool.query;
    pool.query = q;
    await BACKFILL.blitz(5, { statement: 's', isCorrect: true });
    expect(q).toHaveBeenCalledWith('UPDATE questions SET blitz_data=$1 WHERE id=$2', [JSON.stringify({ statement: 's', isCorrect: true }), 5]);
    pool.query = orig;
  });
});

describe('worker — notifyExpiring', () => {
  it('sends a message per expiring sub', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ user_id: 11, plan_id: 'pro', expires_at: 'x' }] });
    await notifyExpiring();
    expect(sendTelegramMessage).toHaveBeenCalledWith(11, expect.stringContaining('PRO'));
  });

  it('does nothing when there are no expiring subs', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await notifyExpiring();
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('logs Sentry breadcrumb on send failure but continues', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ user_id: 11, plan_id: 'pro' }] });
    sendTelegramMessage.mockRejectedValueOnce(new Error('nope'));
    await notifyExpiring();
    expect(Sentry.addBreadcrumb).toHaveBeenCalled();
  });

  it('captures exception on query failure', async () => {
    pool.query.mockRejectedValueOnce(new Error('db down'));
    await notifyExpiring();
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

describe('worker — processExpired', () => {
  it('returns early when no expired subs', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await processExpired();
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('downgrades each expired user in a transaction', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ user_id: 22, plan_id: 'pro' }] });
    const client = { query: vi.fn().mockResolvedValue({}), release: vi.fn() };
    pool.connect.mockResolvedValueOnce(client);
    await processExpired();
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining("status='expired'"), [22]);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledWith(22, expect.stringContaining('expired'));
  });

  it('rolls back and captures exception on per-user failure', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ user_id: 22, plan_id: 'pro' }] });
    const client = { query: vi.fn().mockRejectedValue(new Error('fail')), release: vi.fn() };
    pool.connect.mockResolvedValueOnce(client);
    await processExpired();
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('captures exception on outer query failure', async () => {
    pool.query.mockRejectedValueOnce(new Error('db down'));
    await processExpired();
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

describe('worker — verifyBackupIntegrity', () => {
  it('logs counts and adds breadcrumb', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ count: '10' }] });
    pool.query.mockResolvedValueOnce({ rows: [{ count: '20' }] });
    await verifyBackupIntegrity();
    expect(Sentry.addBreadcrumb).toHaveBeenCalled();
  });

  it('captures exception on failure', async () => {
    pool.query.mockRejectedValueOnce(new Error('db down'));
    await verifyBackupIntegrity();
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

describe('worker — notifyStreakReminders', () => {
  it('sends at-risk and lapsed reminders', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ telegram_id: 1, first_name: 'Al', current_streak: 5 }] });
    pool.query.mockResolvedValueOnce({ rows: [{ telegram_id: 2, first_name: '', current_streak: 0 }] });
    await notifyStreakReminders();
    expect(sendTelegramMessage).toHaveBeenCalledTimes(2);
    expect(sendTelegramMessage).toHaveBeenCalledWith(1, expect.stringContaining('Al'));
  });

  it('captures exception on failure', async () => {
    pool.query.mockRejectedValueOnce(new Error('db down'));
    await notifyStreakReminders();
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

describe('worker — scheduleSubscriptionJobs', () => {
  it('registers three cron schedules', () => {
    scheduleSubscriptionJobs();
    expect(cron.schedule).toHaveBeenCalledTimes(3);
    const exprs = cron.schedule.mock.calls.map(c => c[0]);
    expect(exprs).toContain('0 0 * * *');
    expect(exprs).toContain('0 2 * * 0');
    expect(exprs).toContain('0 8 * * *');
  });
});

describe('worker — runWorker / shutdown', () => {
  it('runWorker initializes the queue table and schedules jobs', async () => {
    const { initQueueTable } = await import('../src/services/queueService.js');
    await runWorker();
    expect(initQueueTable).toHaveBeenCalled();
    expect(cron.schedule).toHaveBeenCalled();
  });

  it('shutdown is idempotent (second call is a no-op)', async () => {
    await shutdown('SIGTERM');
    // second call should not throw or double-process
    await expect(shutdown('SIGTERM')).resolves.toBeUndefined();
  });
});
