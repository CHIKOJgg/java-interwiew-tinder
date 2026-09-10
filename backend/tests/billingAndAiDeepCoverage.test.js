import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHmac } from 'crypto';

// ─── Database and Logger mocks ──────────────────────────────────────────
vi.mock('../src/config/database.js', () => {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const client = {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn(),
  };
  return {
    default: {
      query,
      connect: vi.fn().mockResolvedValue(client),
      on: vi.fn(),
    },
  };
});

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../src/services/metricsService.js', () => ({
  metricsService: {
    trackEvent: vi.fn(),
  },
}));

vi.mock('../src/config/redis.js', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
}));

import pool from '../src/config/database.js';
import * as ukassa from '../src/services/billing/ukassaService.js';
import { sendEmail } from '../src/utils/mailer.js';
import {
  getLanguage,
  getAvailableLanguages,
  getCategories,
} from '../src/services/languageRegistry.js';
import * as aiService from '../src/services/aiService.js';

describe('UKassa Billing Service Deep Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.UKASSA_TOKEN = 'test-ukassa-secret-token';
    process.env.UKASSA_SHOP_ID = '123456';
    process.env.UKASSA_PRO_MONTHLY_AMOUNT = '590';
    process.env.UKASSA_PRO_YEARLY_AMOUNT = '5900';
    process.env.UKASSA_PRO_MAX_MONTHLY_AMOUNT = '4200';
    process.env.UKASSA_PRO_MAX_YEARLY_AMOUNT = '40000';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'pay_created_123',
        status: 'pending',
        confirmation: { confirmation_url: 'https://yookassa.ru/checkout/123' },
      }),
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it('creates payments when enabled and handles missing token error', async () => {
    expect(ukassa.isUkassaEnabled()).toBe(true);

    const payment = await ukassa.createUkassaPayment(
      'user-101',
      'pro',
      'monthly',
      'https://prep.app/return'
    );
    expect(payment.paymentId).toBe('pay_created_123');
    expect(payment.confirmationUrl).toBe('https://yookassa.ru/checkout/123');

    // Test Pro Max yearly
    const proMaxPayment = await ukassa.createUkassaPayment(
      'user-102',
      'pro_max',
      'yearly',
      'https://prep.app/return'
    );
    expect(proMaxPayment.paymentId).toBe('pay_created_123');

    // Test disabled case
    delete process.env.UKASSA_TOKEN;
    expect(ukassa.isUkassaEnabled()).toBe(false);
    await expect(
      ukassa.createUkassaPayment('user-101', 'pro', 'monthly', 'https://prep.app')
    ).rejects.toThrow(/not configured/i);
  });

  it('verifies webhook signatures correctly with HMAC SHA256', () => {
    const rawBody = JSON.stringify({ event: 'payment.succeeded' });
    const validSig = createHmac('sha256', process.env.UKASSA_TOKEN).update(rawBody).digest('hex');

    expect(ukassa.verifyUkassaSignature(rawBody, validSig)).toBe(true);
    expect(ukassa.verifyUkassaSignature(rawBody, 'invalid-signature-12345678901234567890123456789012')).toBe(false);
    expect(ukassa.verifyUkassaSignature(rawBody, null)).toBe(false);
    expect(ukassa.verifyUkassaSignature(null, validSig)).toBe(false);
  });

  it('handles payment.succeeded webhook event with price validation', async () => {
    const successEvent = {
      event: 'payment.succeeded',
      object: {
        id: 'pay_123',
        amount: { value: '590.00', currency: 'RUB' },
        metadata: { userId: '101', planId: 'pro', interval: 'monthly' },
      },
    };
    const res = await ukassa.handleUkassaEvent(successEvent);
    expect(res.activated).toBe(true);
    expect(res.paymentId).toBe('pay_123');

    const underpaidEvent = {
      event: 'payment.succeeded',
      object: {
        id: 'pay_under',
        amount: { value: '100.00', currency: 'RUB' },
        metadata: { userId: '101', planId: 'pro', interval: 'monthly' },
      },
    };
    const mismatchRes = await ukassa.handleUkassaEvent(underpaidEvent);
    expect(mismatchRes.ignored).toBe(true);
    expect(mismatchRes.reason).toBe('amount mismatch');

    const unknownPlanEvent = {
      event: 'payment.succeeded',
      object: {
        id: 'pay_unknown',
        amount: { value: '590.00', currency: 'RUB' },
        metadata: { userId: '101', planId: 'non_existent_plan', interval: 'monthly' },
      },
    };
    const lookupFailRes = await ukassa.handleUkassaEvent(unknownPlanEvent);
    expect(lookupFailRes.ignored).toBe(true);
    expect(lookupFailRes.reason).toBe('price lookup failed');
  });

  it('handles non-activation events: waiting_for_capture, canceled, and empty events', async () => {
    const waitRes = await ukassa.handleUkassaEvent({
      event: 'payment.waiting_for_capture',
      object: { id: 'pay_wait' },
    });
    expect(waitRes.ignored).toBe(true);

    const cancelRes = await ukassa.handleUkassaEvent({
      event: 'payment.canceled',
      object: { id: 'pay_cancel' },
    });
    expect(cancelRes.ignored).toBe(true);

    expect(await ukassa.handleUkassaEvent(null)).toEqual({ ignored: true });
    expect(await ukassa.handleUkassaEvent({})).toEqual({ ignored: true });
    expect(await ukassa.handleUkassaEvent({ event: 'payment.succeeded', object: {} })).toEqual({ ignored: true });
  });

  it('handles duplicate key constraint 23505 gracefully', async () => {
    const client = await pool.connect();
    client.query.mockRejectedValueOnce({ code: '23505' });

    const duplicateEvent = {
      event: 'payment.succeeded',
      object: {
        id: 'pay_dup',
        amount: { value: '590.00', currency: 'RUB' },
        metadata: { userId: '101', planId: 'pro', interval: 'monthly' },
      },
    };

    const res = await ukassa.handleUkassaEvent(duplicateEvent);
    expect(res.activated).toBe(true);
  });
});

describe('Mailer Utility Deep Tests', () => {
  it('sends email successfully or handles fallback', async () => {
    const result = await sendEmail({
      to: 'user@example.com',
      subject: 'Interview Prep Code',
      text: 'Your code is 123456',
    });
    expect(typeof result).toBe('boolean');
  });
});

describe('LanguageRegistry Deep Coverage Across All 7 Languages', () => {
  it('covers all languages and prompt builders for Go, Rust, React, Kotlin, Java, Python, TypeScript', () => {
    const allLangs = getAvailableLanguages();
    expect(allLangs).toContain('Java');
    expect(allLangs).toContain('Python');
    expect(allLangs).toContain('TypeScript');
    expect(allLangs).toContain('Go');
    expect(allLangs).toContain('Rust');
    expect(allLangs).toContain('React');
    expect(allLangs).toContain('Kotlin');

    for (const langId of allLangs) {
      const lang = getLanguage(langId);
      expect(lang.id).toBe(langId);
      expect(getCategories(langId).length).toBeGreaterThan(0);

      const exp = lang.prompts.explanation('What is X?', 'X is Y');
      expect(exp.system).toBeDefined();
      expect(exp.user).toBeDefined();

      const test = lang.prompts.test('What is X?', 'Correct Answer');
      expect(test.system).toBeDefined();
      expect(test.user).toBeDefined();

      const bug = lang.prompts.bug('Find bug', 'Code with bug');
      expect(bug.system).toBeDefined();
      expect(bug.user).toBeDefined();

      const blitz = lang.prompts.blitz('Quick question', 'Quick answer');
      expect(blitz.system).toBeDefined();
      expect(blitz.user).toBeDefined();

      const code = lang.prompts.code('Complete snippet', 'Code');
      expect(code.system).toBeDefined();
      expect(code.user).toBeDefined();

      const interview = lang.prompts.interview('Interview question', 'Candidate answer');
      expect(interview.system).toBeDefined();
      expect(interview.user).toBeDefined();

      const resume = lang.prompts.resume('Resume text');
      expect(resume.system).toBeDefined();
      expect(resume.user).toBeDefined();

      const practice = lang.prompts.resumePractice({ skills: ['A'], experienceLevel: 'Middle' });
      expect(practice.system).toBeDefined();
      expect(practice.user).toBeDefined();

      const vacancy = lang.prompts.vacancy('Job vacancy description');
      expect(vacancy.system).toBeDefined();
      expect(vacancy.user).toBeDefined();
    }

    const fallback = getLanguage('UnknownLanguage');
    expect(fallback.id).toBe('Java');
  });
});

describe('AIService Mode Generators and Cache Functions', () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'sk-or-v1-mock-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: 'Polymorphism',
                theory: 'Ability of an object to take many forms.',
                score: 9,
                skills: ['Java', 'Spring'],
                questions: ['What is an interface?'],
              }),
            },
          },
        ],
      }),
    });
  });

  it('generates buggy code, blitz statement, and evaluates interview answers', async () => {
    const buggy = await aiService.generateBuggyCode('Find deadlock bug', 'Concurrency', 101, 'Java');
    expect(buggy).toBeDefined();

    const blitz = await aiService.generateBlitzStatement('Is String immutable in Java?', 'Core', 101, 'Java');
    expect(blitz).toBeDefined();

    const interview = await aiService.evaluateInterviewAnswer('Explain JVM', 'JVM compiles bytecode', 101, 'Java');
    expect(interview).toBeDefined();

    const completion = await aiService.generateCodeCompletion('Fill in stream map', 'Collections', 101, 'Java');
    expect(completion).toBeDefined();

    const resume = await aiService.analyzeResume('Experienced Java Backend dev', 101, 'Java');
    expect(resume).toBeDefined();

    const resumeQuestions = await aiService.generateResumeQuestions({ skills: ['Java', 'Docker'] }, 'Java');
    expect(resumeQuestions).toBeDefined();

    const vacancyQuestions = await aiService.generateVacancyQuestions('Looking for Java Senior dev', 'Java');
    expect(vacancyQuestions).toBeDefined();
  });

  it('handles cache eviction and cache checking', async () => {
    await aiService.evictCache('What is JVM?', 'explanation', 'Java');
    const cached = await aiService.checkCache('What is JVM?', 'explanation', null, 'Java');
    expect(cached).toBeNull();
  });
});
