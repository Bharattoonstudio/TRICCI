/**
 * POST /api/otp/send-public
 * Public endpoint — no session required.
 * Used during signup to verify email+mobile before account creation.
 *
 * Body: { phone: string, email: string, purpose?: string }
 * Rate-limited: 3 OTPs per email per 10 minutes.
 * OTP is delivered to BOTH email inbox AND SMS (via Fast2SMS if key is set).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { otpStore } from '@/server/db/schema.js';
import { eq, and, gt, isNotNull } from 'drizzle-orm';
import { sendEmail } from '@/server/email.js';
import { randomInt } from 'crypto';

async function sendSmsOtp(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) {
    console.log('[otp.send-public] FAST2SMS_API_KEY not set — skipping SMS');
    return;
  }
  const url = 'https://www.fast2sms.com/dev/bulkV2';
  const body = new URLSearchParams({
    authorization: String(apiKey),
    variables_values: otp,
    route: 'otp',
    numbers: phone,
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json() as { return?: boolean; message?: string[] };
  if (!data.return) {
    throw new Error(`Fast2SMS error: ${JSON.stringify(data.message)}`);
  }
  console.log(`[otp.send-public] SMS sent to +91${phone} via Fast2SMS`);
}

function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

export default async function handler(req: Request, res: Response) {
  try {
    const { phone, email, purpose = 'signup_mobile' } = req.body as {
      phone?: string;
      email?: string;
      purpose?: string;
    };

    if (!phone || !phone.match(/^[6-9]\d{9}$/)) {
      return res.status(400).json({ error: 'Valid 10-digit Indian mobile number required.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required to receive the OTP.' });
    }

    // Use email as identifier so rate-limit and verify both work on the same key
    const identifier = `email:${email.toLowerCase().trim()}`;

    // Rate-limit: max 3 OTPs per email per 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recent = await db
      .select({ id: otpStore.id })
      .from(otpStore)
      .where(
        and(
          eq(otpStore.identifier, identifier),
          eq(otpStore.purpose, purpose),
          isNotNull(otpStore.createdAt),
          gt(otpStore.createdAt, tenMinAgo),
        ),
      );

    if (recent.length >= 3) {
      return res.status(429).json({ error: 'Too many OTP requests. Please wait 10 minutes before trying again.' });
    }

    // Clean up old expired OTPs for this identifier to keep the table tidy
    await db
      .delete(otpStore)
      .where(
        and(
          eq(otpStore.identifier, identifier),
          eq(otpStore.purpose, purpose),
        ),
      )
      .catch(() => { /* non-critical */ });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otpStore).values({ identifier, otp, purpose, expiresAt });

    // ── Delivery: Email + SMS (parallel, SMS is best-effort) ─────────────────
    const hasSmsKey = !!process.env.FAST2SMS_API_KEY;

    const emailPromise = sendEmail({
      to: email,
      subject: 'Your TRICCI verification code',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0d0d;color:#f0f0f0;border-radius:16px;border:1px solid #ffffff0d;">
          <div style="height:3px;background:linear-gradient(90deg,#E8470A,#6B4FBB);border-radius:3px;margin-bottom:28px;"></div>
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#E8470A;text-transform:uppercase;">Signup Verification</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#ffffff;">Verify your account</h1>
          <p style="margin:0 0 8px;font-size:14px;color:#888;">Mobile: <strong style="color:#fff;">+91 ${phone}</strong></p>
          <p style="margin:0 0 24px;font-size:14px;color:#888;">Use this one-time code to complete your TRICCI signup. It expires in <strong style="color:#fff;">10 minutes</strong>.</p>
          <div style="background:#111;border:2px solid #E8470A;border-radius:14px;padding:28px;text-align:center;margin:0 0 24px;">
            <span style="font-size:48px;font-weight:900;letter-spacing:16px;color:#E8470A;font-variant-numeric:tabular-nums;">${otp}</span>
          </div>
          ${hasSmsKey ? '<p style="margin:0 0 8px;font-size:13px;color:#666;">📱 We also sent this code to your mobile number via SMS.</p>' : ''}
          <p style="margin:0 0 8px;font-size:13px;color:#555;background:#1a1a1a;border-radius:8px;padding:10px 14px;">
            📬 <strong style="color:#888;">Can't find this email?</strong> Check your <strong style="color:#aaa;">Spam / Junk</strong> folder and mark it as "Not Spam".
          </p>
          <p style="margin:8px 0 0;font-size:12px;color:#333;">© 2025 TRICCI · tricci.in</p>
        </div>
      `,
      text: `Your TRICCI verification code: ${otp}\n\nThis code expires in 10 minutes.\n\nCan't find this email? Check your Spam/Junk folder.\n\nIf you didn't request this, ignore this email.`,
    });

    // SMS is best-effort — don't fail the whole request if it errors
    const smsPromise = sendSmsOtp(phone, otp).catch(err => {
      console.error('[otp.send-public] SMS delivery failed (non-fatal):', err);
    });

    await Promise.all([emailPromise, smsPromise]);

    const smsDelivered = hasSmsKey;
    console.log(`[otp.send-public] OTP sent to ${email} + phone +91${phone} (sms=${smsDelivered})`);
    res.json({
      success: true,
      message: smsDelivered
        ? 'OTP sent to your email and mobile number'
        : 'OTP sent to your email',
      sms: smsDelivered,
    });
  } catch (err) {
    console.error('[otp.send-public] ERROR:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
}
