/**
 * Rate Limiting Middleware
 * Prevents brute force attacks on:
 * - OTP sending (3 per hour per phone)
 * - Authentication (5 failed attempts per hour per IP)
 * - Signup (10 per day per IP)
 */

import type { Request, Response, NextFunction } from 'express';

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getKey(type: string, identifier: string): string {
  return `${type}:${identifier}`;
}

function checkLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true; // Allow
  }

  if (entry.count < limit) {
    entry.count++;
    return true; // Allow
  }

  return false; // Block
}

// Middleware factories
export function rateLimitOTP() {
  return (req: Request, res: Response, next: NextFunction) => {
    const phone = (req.body as { phone?: string }).phone || req.ip || 'unknown';
    const key = getKey('otp', phone);
    
    if (!checkLimit(key, 3, 60 * 60 * 1000)) { // 3 per hour
      return res.status(429).json({
        error: 'Too many OTP requests. Try again in 1 hour.',
        retryAfter: 3600,
      });
    }
    next();
  };
}

export function rateLimitSignin() {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const key = getKey('signin', ip);
    
    if (!checkLimit(key, 5, 60 * 60 * 1000)) { // 5 per hour
      return res.status(429).json({
        error: 'Too many login attempts. Try again in 1 hour.',
        retryAfter: 3600,
      });
    }
    next();
  };
}

export function rateLimitSignup() {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const key = getKey('signup', ip);
    
    if (!checkLimit(key, 10, 24 * 60 * 60 * 1000)) { // 10 per day
      return res.status(429).json({
        error: 'Too many signup attempts. Try again tomorrow.',
        retryAfter: 86400,
      });
    }
    next();
  };
}

export function rateLimitAPI(limit: number = 100, windowMs: number = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const key = getKey('api', ip);
    
    if (!checkLimit(key, limit, windowMs)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }
    next();
  };
}

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);
