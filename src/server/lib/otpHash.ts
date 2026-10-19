/**
 * OTP hashing.
 *
 * OTP codes are stored as a keyed hash (HMAC-SHA256), never as the code itself.
 * The hash is bound to the identifier and purpose, so a code can't be reused
 * across accounts or purposes. The key is the server secret (BETTER_AUTH_SECRET).
 *
 * The SMS or email still carries the plain code. Only the stored copy is hashed.
 */
import { createHmac } from 'node:crypto';

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s) throw new Error('BETTER_AUTH_SECRET is not set; cannot hash OTP codes');
  return s;
}

export function hashOtp(identifier: string, purpose: string, otp: string): string {
  return createHmac('sha256', secret())
    .update(`${purpose}\u0000${identifier}\u0000${otp}`)
    .digest('hex');
}
