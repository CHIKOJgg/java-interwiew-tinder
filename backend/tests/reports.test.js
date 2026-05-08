import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../src/config/database.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    on: vi.fn(),
    connect: vi.fn(),
  }
}));

vi.mock('../src/config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  }
}));

vi.mock('pino-http', () => ({
  default: vi.fn().mockReturnValue((req, res, next) => {
    req.log = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
    next();
  }),
}));

vi.mock('../src/config/redis.js', () => ({
  default: {
    get: vi.fn(),
    setex: vi.fn(),
    on: vi.fn(),
  },
  isConnected: vi.fn().mockResolvedValue(true),
}));

// Set test env
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';

const { default: app } = await import('../src/server.js');
const { default: pool } = await import('../src/config/database.js');

describe('Reports API', () => {
  const JWT_SECRET = 'test_secret';
  const USER_ID = '987654321';
  let token;

  beforeAll(() => {
    token = jwt.sign({ userId: USER_ID, plan: 'free' }, JWT_SECRET);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow user to report a question', async () => {
    pool.query.mockResolvedValueOnce({}); // INSERT report
    pool.query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // COUNT reports

    const response = await request(app)
      .post('/api/questions/100/report')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'wrong_answer', comment: 'The answer is actually C' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO question_reports'),
      ['100', USER_ID, 'wrong_answer', 'The answer is actually C']
    );
  });

  it('should automatically hide question if reports reach 5', async () => {
    pool.query.mockResolvedValueOnce({}); // INSERT report
    pool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] }); // COUNT reports
    pool.query.mockResolvedValueOnce({}); // UPDATE questions
    pool.query.mockResolvedValueOnce({ rows: [{ question_text: 'Sample Q' }] }); // SELECT question_text

    const response = await request(app)
      .post('/api/questions/101/report')
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'inappropriate', comment: 'spam' });

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(5);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE questions SET is_active = FALSE'),
      ['101']
    );
  });
});
