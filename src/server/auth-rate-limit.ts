/**
 * Simple in-memory rate limiting for OTP send/verify endpoints.
 * Prevents abuse (spamming OTP requests) without needing Redis —
 * fine for a single-instance Node server like this one.
 */
import type { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const sendAttempts = new Map<string, RateLimitEntry>();
const verifyAttempts = new Map<string, RateLimitEntry>();

const SEND_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const SEND_MAX = 5; // max 5 OTP sends per identifier per window

const VERIFY_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const VERIFY_MAX = 10; // max 10 verify attempts per identifier per window

function getIdentifier(req: Request): string {
  // Prefer phone/email from body if present, fall back to IP
  const body = req.body as { phone?: string; email?: string } | undefined;
  return body?.phone || body?.email || req.ip || 'unknown';
}

function checkLimit(store: Map<string, RateLimitEntry>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= max) {
    return false;
  }

  entry.count += 1;
  return true;
}

export function otpSendRateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = getIdentifier(req);
  if (!checkLimit(sendAttempts, key, SEND_MAX, SEND_WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many OTP requests. Please try again in a few minutes.' });
  }
  next();
}

export function otpVerifyRateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = getIdentifier(req);
  if (!checkLimit(verifyAttempts, key, VERIFY_MAX, VERIFY_WINDOW_MS)) {
    return res.status(429).json({ error: 'Too many verification attempts. Please try again later.' });
  }
  next();
}

// Periodically clear expired entries so the maps don't grow unbounded
export function setupRateLimitCleanup() {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of sendAttempts) {
      if (entry.resetAt < now) sendAttempts.delete(key);
    }
    for (const [key, entry] of verifyAttempts) {
      if (entry.resetAt < now) verifyAttempts.delete(key);
    }
  }, 5 * 60 * 1000); // every 5 minutes
}
