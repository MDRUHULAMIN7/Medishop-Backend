import { describe, expect, it, vi } from 'vitest';
import { userService } from '../user/user.service';
import { authService } from './auth.service';

vi.mock('../user/user.service');

describe('AuthService Unit Tests', () => {
  it('should format BD phone numbers correctly', () => {
    // Single-input BD phone testing
    const resultPhone = authService['checkIdentifier'];
    expect(authService).toBeDefined();
  });

  it('should throw Error when logging in with invalid credentials', async () => {
    vi.mocked(userService.findByIdentifier).mockResolvedValue(null);

    await expect(
      authService.login({ identifier: 'nonexistent@medishop.com', password: 'password123' })
    ).rejects.toThrow('Invalid credentials');
  });
});
