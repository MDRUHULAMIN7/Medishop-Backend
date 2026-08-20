import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';

describe('Shared Inventory & POS Integration Endpoints', () => {
  it('GET /api/v1/products/admin should be registered and require auth', async () => {
    const res = await request(app).get('/api/v1/products/admin?page=1&limit=10');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/pos/scanner/session should be registered and require auth', async () => {
    const res = await request(app).post('/api/v1/pos/scanner/session').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/pos/recognition should be registered and require auth', async () => {
    const res = await request(app).post('/api/v1/pos/recognition');
    expect(res.status).toBe(401);
  });

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

  it('GET /api/v1/admin/reports/analytics should be registered and require auth', async () => {
    const res = await request(app).get('/api/v1/admin/reports/analytics?channel=pos&includeRows=true');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/admin/products/:id/insights should be registered and require auth', async () => {
    const res = await request(app).get('/api/v1/admin/products/507f1f77bcf86cd799439011/insights');
    expect(res.status).toBe(401);
  });
});
