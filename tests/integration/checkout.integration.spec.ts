import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';

describe('Checkout Integration Endpoints', () => {
  it('POST /api/v1/orders/checkout should return 401 Unauthorized without auth token', async () => {
    const res = await request(app).post('/api/v1/orders/checkout').send({
      shippingAddress: {
        recipientName: 'Test Buyer',
        phone: '01700000000',
        district: 'Dhaka',
        thana: 'Mirpur',
        addressLine: 'House 1',
      },
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
