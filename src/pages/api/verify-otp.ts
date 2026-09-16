import { db } from '@/server/db/client';
import { otpStore } from '@/server/db/schema';
import { sql } from 'drizzle-orm';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Verify OTP endpoint — verify OTP before password reset
 * Location: src/pages/api/verify-otp.ts (NOT under /api/auth/)
 * Marks OTP as verified in database
 * Returns: verified status
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP required' });
  }

  try {
    // Find and verify OTP
    const otpResult = await db.execute(
      sql`
        SELECT id FROM otp_store
        WHERE identifier = ${email}
        AND otp = ${otp}
        AND verified = FALSE
        AND expires_at > NOW()
        LIMIT 1
      `
    );

    if (!otpResult.rows || otpResult.rows.length === 0) {
      console.log(`[VERIFY-OTP] ❌ OTP verification failed for ${email}`);
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as verified
    await db.execute(
      sql`
        UPDATE otp_store
        SET verified = TRUE, verified_at = NOW()
        WHERE identifier = ${email}
        AND otp = ${otp}
      `
    );

    console.log(`[VERIFY-OTP] ✅ OTP verified for ${email}`);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error(`[VERIFY-OTP] ❌ Error:`, error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'OTP verification failed' });
  }
}
