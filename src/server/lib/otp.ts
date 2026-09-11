import { db } from '@/server/db/client.js';
import { sql } from 'drizzle-orm';
import { sendEmail } from '@/server/email.js';

/**
 * Generate a random 6-digit OTP code
 */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to email
 */
export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
  try {
    await sendEmail({
      to: email,
      subject: 'Your TRICCI Password Reset Code',
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
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return false;
  }
}

/**
 * Create and store OTP for email
 */
export async function createOtp(email: string): Promise<string | null> {
  try {
    // Delete expired OTPs for this email
    await db.execute(
      sql`DELETE FROM password_reset_otp WHERE email = ${email} AND expires_at < NOW()`
    );

    const otp = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.execute(
      sql`INSERT INTO password_reset_otp (email, otp_code, expires_at) VALUES (${email}, ${otp}, ${expiresAt})`
    );

    return otp;
  } catch (error) {
    console.error('Failed to create OTP:', error);
    return null;
  }
}

/**
 * Verify OTP code
 */
export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`
        SELECT id FROM password_reset_otp 
        WHERE email = ${email} 
        AND otp_code = ${otp}
        AND expires_at > NOW()
        AND verified_at IS NULL
        AND used = FALSE
        LIMIT 1
      `
    );

    if (result.rows.length === 0) {
      return false;
    }

    // Mark as verified
    await db.execute(
      sql`
        UPDATE password_reset_otp 
        SET verified_at = NOW(), used = TRUE 
        WHERE email = ${email} AND otp_code = ${otp}
      `
    );

    return true;
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    return false;
  }
}

/**
 * Check if OTP was already verified
 */
export async function isOtpVerified(email: string, otp: string): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`
        SELECT verified_at FROM password_reset_otp 
        WHERE email = ${email} 
        AND otp_code = ${otp}
        AND verified_at IS NOT NULL
        LIMIT 1
      `
    );

    return result.rows.length > 0;
  } catch (error) {
    return false;
  }
}
