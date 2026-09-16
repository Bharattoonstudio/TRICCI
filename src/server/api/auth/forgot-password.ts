import { db } from '@/server/db/client';
import { otpStore } from '@/server/db/schema';
import { sql } from 'drizzle-orm';
import { sendEmail } from '@/server/email';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Generate 6-digit OTP
 */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Forgot password endpoint — generate OTP and send via email
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Clean up expired OTPs for this email
    await db.execute(
      sql`DELETE FROM otp_store WHERE identifier = ${email} AND expires_at < NOW()`
    );

    // Generate OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    await db.insert(otpStore).values({
      identifier: email,
      otp,
      purpose: 'verify',
      expiresAt,
      verified: false,
    });

    console.log(`[FORGOT-PASSWORD] OTP generated for ${email}`);

    // Send OTP via email
    try {
      await sendEmail({
        to: email,
        subject: 'Reset your TRICCI password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1A0A00;color:#F5F5F5;border-radius:12px;">
            <h1 style="color:#FF6B35;font-size:24px;margin:0 0 8px;">Reset Your Password</h1>
            <p style="color:#aaa;margin:0 0 24px;">Your verification code is:</p>
            <div style="background:#2d1810;padding:24px;border-radius:8px;text-align:center;margin:0 0 24px;">
              <p style="font-size:48px;font-weight:bold;letter-spacing:8px;margin:0;color:#FF6B35;font-family:monospace;">${otp}</p>
            </div>
            <p style="color:#aaa;margin:0 0 16px;">This code expires in <strong>10 minutes</strong>.</p>
            <p style="color:#666;font-size:12px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
        text: `Your TRICCI password reset code is: ${otp}`,
      });

      console.log(`[FORGOT-PASSWORD] ✅ OTP email sent to ${email}`);
    } catch (emailError) {
      console.error(`[FORGOT-PASSWORD] ⚠️  Email failed for ${email}:`, emailError);
      // Continue anyway — OTP is stored, they can try again
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      expiresIn: 600, // seconds
    });
  } catch (error) {
    console.error(`[FORGOT-PASSWORD] ❌ Error:`, error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to process password reset' });
  }
}