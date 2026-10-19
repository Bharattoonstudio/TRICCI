/**
 * Unit tests: OTP hashing. Pure logic only, no database.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { hashOtp } from '../server/lib/otpHash';

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'unit-test-secret-not-real';
});

describe('hashOtp', () => {
  it('never returns the plain code', () => {
    const h = hashOtp('email:a@example.com', 'login_mobile', '123456');
    expect(h).not.toContain('123456');
    expect(h).toHaveLength(64);
  });

  it('is the same for the same identifier, purpose and code (so verify can match)', () => {
    expect(hashOtp('email:a@example.com', 'login_mobile', '123456'))
      .toBe(hashOtp('email:a@example.com', 'login_mobile', '123456'));
  });

  it('changes when the code changes', () => {
    expect(hashOtp('email:a@example.com', 'login_mobile', '123456'))
      .not.toBe(hashOtp('email:a@example.com', 'login_mobile', '123457'));
  });

  it('is bound to the identifier, so a code cannot be reused on another account', () => {
    expect(hashOtp('email:a@example.com', 'login_mobile', '123456'))
      .not.toBe(hashOtp('email:b@example.com', 'login_mobile', '123456'));
  });

  it('is bound to the purpose, so a signup code cannot be used to log in', () => {
    expect(hashOtp('email:a@example.com', 'login_mobile', '123456'))
      .not.toBe(hashOtp('email:a@example.com', 'signup_mobile', '123456'));
  });

  it('refuses to run without the server secret', () => {
    const saved = process.env.BETTER_AUTH_SECRET;
    delete process.env.BETTER_AUTH_SECRET;
    expect(() => hashOtp('email:a@example.com', 'login_mobile', '123456')).toThrow();
    process.env.BETTER_AUTH_SECRET = saved;
  });
});
