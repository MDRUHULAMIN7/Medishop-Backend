import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../utils/AppError';
import { posService } from './pos.service';

describe('PosService Unit Tests', () => {
  it('should reject POS sale with empty items array', async () => {
    await expect(
      posService.processPosSale('staff-1', {
        items: [],
        paidAmount: 500,
      })
    ).rejects.toThrow(ValidationError);
  });
});
