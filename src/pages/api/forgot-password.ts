import { db } from '@/server/db/client';
import { otpStore } from '@/server/db/schema';
import { sql } from 'drizzle-orm';
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendEmail } from '@/lib/email'; // Import your email service

/**
 * Forgot password endpoint — generate and send OTP
 * Location: src/pages/api/forgot-password.ts (NOT under /api/auth/)
 * Generates 6-digit OTP, stores in database, sends via email
 * Returns: OTP sent message on success
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    // Check if user exists
    const userResult = await db.execute(
      sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      // Don't reveal if email exists for security
      console.log(`[FORGOT-PASSWORD] ⚠️  User not found: ${email}`);
      return res.status(200).json({ message: 'If email exists, OTP will be sent shortly' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up any expired OTPs for this email
    await db.execute(
      sql`DELETE FROM otp_store WHERE identifier = ${email} AND expires_at < NOW()`
    );

    // Store OTP in database
    await db.execute(
      sql`
        INSERT INTO otp_store (identifier, otp, purpose, expires_at, created_at)
        VALUES (${email}, ${otp}, 'password_reset', ${expiresAt}, NOW())
        ON CONFLICT (identifier) DO UPDATE SET otp = ${otp}, expires_at = ${expiresAt}
      `
    );

    // Send OTP via email
    await sendEmail({
      to: email,
      subject: 'TRICCI - Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your TRICCI password. Use the OTP below to proceed:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="letter-spacing: 4px; color: #333;">${otp}</h1>
            <p style="color: #666;">This OTP expires in 10 minutes</p>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    console.log(`[FORGOT-PASSWORD] ✅ OTP sent to ${email}`);

    return res.status(200).json({
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error(`[FORGOT-PASSWORD] ❌ Error:`, error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
}
