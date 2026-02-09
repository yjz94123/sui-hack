import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue(1),
    event: { count: vi.fn().mockResolvedValue(0) },
    market: { count: vi.fn().mockResolvedValue(0) },
  },
}));

import { app } from '../../src/app';

describe('GET /api/v1/health', () => {
  it('returns health payload', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.services.database.status).toBe('ok');
  });
});

