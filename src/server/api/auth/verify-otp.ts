import { db } from '@/server/db/client';
import { otpStore } from '@/server/db/schema';
import { sql } from 'drizzle-orm';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Verify OTP endpoint — check if OTP is valid and not expired
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
    // Find matching OTP that hasn't expired and hasn't been verified yet
    const result = await db.execute(
      sql`
        SELECT id, otp, expires_at, verified
        FROM otp_store
        WHERE identifier = ${email}
        AND otp = ${otp}
        AND expires_at > NOW()
        AND verified = FALSE
        LIMIT 1
      `
    );

    if (!result.rows || result.rows.length === 0) {
      console.log(`[VERIFY-OTP] ❌ Invalid or expired OTP for ${email}`);
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    const otpRecord = result.rows[0];

    // Mark OTP as verified
    await db.execute(
      sql`UPDATE otp_store SET verified = TRUE WHERE id = ${(otpRecord as any).id}`
    );

    console.log(`[VERIFY-OTP] ✅ OTP verified for ${email}`);

    return res.status(200).json({
      success: true,
      message: 'OTP verified. You can now reset your password.',
    });
  } catch (error) {
    console.error(`[VERIFY-OTP] ❌ Error:`, error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'OTP verification failed' });
  }
}