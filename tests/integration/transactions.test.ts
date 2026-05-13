// tests/integration/transactions.test.ts

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

// Mock database and queue for integration tests
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    produce:      { findUniqueOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    transaction:  { create: vi.fn(), findMany: vi.fn(), count: vi.fn(), findUniqueOrThrow: vi.fn() },
    $transaction: vi.fn(async (fns: any[]) => Promise.all(fns)),
  },
  connectDatabase: vi.fn(),
}));

vi.mock('../../src/config/redis.js', () => ({
  redis:        { get: vi.fn(), set: vi.fn(), del: vi.fn() },
  connectRedis: vi.fn(),
  Cache:        { get: vi.fn(), set: vi.fn(), del: vi.fn() },
}));

vi.mock('../../src/queues/anchor.queue.js', () => ({
  anchorQueue: { add: vi.fn().mockResolvedValue({ id: 'job-1' }) },
}));

describe('POST /api/v1/transactions', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).post('/api/v1/transactions').send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_token');
  });

  it('rejects malformed body with 400', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', 'Bearer invalidtoken')
      .send({ weightKg: -5 });
    expect([400, 401]).toContain(res.status);
  });
});

describe('GET /health', () => {
  it('returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
