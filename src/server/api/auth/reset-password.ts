import { db } from '@/server/db/client';
import { account, otpStore } from '@/server/db/schema';
import { sql } from 'drizzle-orm';
import { hash } from 'better-auth/password';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Reset password endpoint — update password after OTP verification
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and password required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    // Verify OTP is marked as verified
    const otpResult = await db.execute(
      sql`
        SELECT id FROM otp_store
        WHERE identifier = ${email}
        AND otp = ${otp}
        AND verified = TRUE
        AND expires_at > NOW()
        LIMIT 1
      `
    );

    if (!otpResult.rows || otpResult.rows.length === 0) {
      console.log(`[RESET-PASSWORD] ❌ OTP not verified for ${email}`);
      return res.status(401).json({ error: 'OTP not verified or expired' });
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword);

    // Find user and update password in account table
    const userResult = await db.execute(
      sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      console.log(`[RESET-PASSWORD] ❌ User not found for ${email}`);
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = (userResult.rows[0] as any).id;

    // Update password in account table
    await db.execute(
      sql`UPDATE account SET password = ${hashedPassword} WHERE user_id = ${userId}`
    );

    // Mark OTP as used (optional — just for audit)
    await db.execute(
      sql`DELETE FROM otp_store WHERE identifier = ${email} AND otp = ${otp}`
    );

    console.log(`[RESET-PASSWORD] ✅ Password reset for ${email}`);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login.',
    });
  } catch (error) {
    console.error(`[RESET-PASSWORD] ❌ Error:`, error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Password reset failed' });
  }
}