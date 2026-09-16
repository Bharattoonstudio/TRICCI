import { db } from '@/server/db/client';
import { sql } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { sendEmail } from '@/lib/email';

export async function forgotPasswordHandler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  try {
    const userResult = await db.execute(
      sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      console.log(`[FORGOT-PASSWORD] ⚠️  User not found: ${email}`);
      return res.status(200).json({ message: 'If email exists, OTP will be sent shortly' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.execute(
      sql`DELETE FROM otp_store WHERE identifier = ${email} AND expires_at < NOW()`
    );

    await db.execute(
      sql`INSERT INTO otp_store (identifier, otp, purpose, expires_at, created_at) VALUES (${email}, ${otp}, 'password_reset', ${expiresAt}, NOW()) ON CONFLICT (identifier) DO UPDATE SET otp = ${otp}, expires_at = ${expiresAt}`
    );

    await sendEmail({
      to: email,
      subject: 'TRICCI - Password Reset OTP',
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2>Password Reset Request</h2><p>Use this OTP to reset your password:</p><div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;"><h1 style="letter-spacing: 4px; color: #333;">${otp}</h1><p style="color: #666;">Expires in 10 minutes</p></div></div>`,
    });

    console.log(`[FORGOT-PASSWORD] ✅ OTP sent to ${email}`);

    return res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error(`[FORGOT-PASSWORD] ❌ Error:`, error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
}

export default forgotPasswordHandler;
