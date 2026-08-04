import { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { authorize } from '../../src/middlewares/authorize';

describe('authorize middleware', () => {
  it('allows permitted roles', () => {
    const req = { user: { id: '1', role: 'sales_staff', sessionId: 'session-1' } } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    authorize('sales_staff')(req, res, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects forbidden roles', () => {
    const req = { user: { id: '1', role: 'customer', sessionId: 'session-1' } } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    authorize('admin')(req, res, next as unknown as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect((next.mock.calls[0][0] as Error).message).toBe('Forbidden.');
  });
});
