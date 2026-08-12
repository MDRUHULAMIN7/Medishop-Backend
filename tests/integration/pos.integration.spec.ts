import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';

describe('Shared Inventory & POS Integration Endpoints', () => {
  it('GET /api/v1/stores should return 401 Unauthorized without auth token', async () => {
    const res = await request(app).get('/api/v1/stores');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/pos/inventory should return 401 Unauthorized without auth token', async () => {
    const res = await request(app).get('/api/v1/pos/inventory');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/pos/checkout should return 401 Unauthorized without auth token', async () => {
    const res = await request(app).post('/api/v1/pos/checkout').send({
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: 2 }],
      paidAmount: 200,
    });
    expect(res.status).toBe(401);
  });
});
