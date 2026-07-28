/**
 * POST /api/otp/send
 * Body: { identifier: string (phone or email), purpose: 'verify' | '2fa' }
 * Generates a 6-digit OTP, stores it, and sends via email (SMS gateway TBD).
 */
import type { Request, Response } from 'express'; import { db } from '@/server/db/client.js'; import { otpStore } from '@/server/db/schema.js'; import { eq, and, gt } from 'drizzle-orm'; import { sendEmail } from '@/server/email.js'; import { toWebRequest } from '@/lib/auth/express-adapter.js'; import { getAuth } from '@/lib/auth/auth.js';

import { randomInt } from 'crypto';

async function sendSmsOtp(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return;
  const body = new URLSearchParams({
    authorization: String(apiKey),
    variables_values: otp,
    route: 'otp',
    numbers: phone.replace(/^\+91/, ''),
  });
  const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await res.json() as { return?: boolean; message?: string[] };
  if (!data.return) throw new Error(`Fast2SMS: ${JSON.stringify(data.message)}`);
  console.log(`[otp.send] SMS sent to ${phone} via Fast2SMS`); }

function generateOtp(): string {
  // crypto.randomInt is cryptographically secure — never use Math.random() for OTPs
  return String(randomInt(100000, 1000000)); }

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { identifier, purpose = 'verify' } = req.body as { identifier?: string; purpose?: string };
    if (!identifier) return res.status(400).json({ error: 'identifier is required' });

    // Rate-limit: max 3 OTPs per identifier per 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recent = await db.select({ id: otpStore.id })
      .from(otpStore)
      .where(and(eq(otpStore.identifier, identifier), gt(otpStore.createdAt, tenMinAgo)));
    if (recent.length >= 3) {
      return res.status(429).json({ error: 'Too many OTP requests. Please wait 10 minutes.' });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db.insert(otpStore).values({ identifier, otp, purpose, expiresAt });

    // Determine if identifier is email or phone
    const isEmail = identifier.includes('@');
    const userEmail = session.user.email;

    if (isEmail) {
      await sendEmail({
        to: identifier,
        subject: 'Your TRICCI verification code',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1A0A00;color:#F5F5F5;border-radius:12px;">
            <h1 style="color:#FF6B35;font-size:22px;margin:0 0 8px;">Your verification code</h1>
            <p style="color:#aaa;margin:0 0 24px;">Use this code to verify your identity on TRICCI. It expires in 10 minutes.</p>
            <div style="background:#2a1200;border:2px solid #FF6B35;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
              <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#FF6B35;">${otp}</span>
            </div>
            <p style="color:#666;font-size:12px;">If you didn't request this, ignore this email.</p>
          </div>
        `,
        text: `Your TRICCI verification code: ${otp}. Expires in 10 minutes.`,
      });
    } else {
      // Phone: send via SMS (Fast2SMS) with email fallback
      const smsSent = await sendSmsOtp(identifier, otp).then(() => true).catch(err => {
        console.error('[otp.send] SMS failed, falling back to email:', err);
        return false;
      });

      if (!smsSent) {
        // Fallback: send to user's registered email
        await sendEmail({
          to: userEmail,
          subject: 'Your TRICCI mobile verification code',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1A0A00;color:#F5F5F5;border-radius:12px;">
              <h1 style="color:#FF6B35;font-size:22px;margin:0 0 8px;">Mobile verification code</h1>
              <p style="color:#aaa;margin:0 0 8px;">Verifying mobile: <strong style="color:#fff;">${identifier}</strong></p>
              <p style="color:#aaa;margin:0 0 24px;">Use this code to verify your mobile number. Expires in 10 minutes.</p>
              <div style="background:#2a1200;border:2px solid #FF6B35;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#FF6B35;">${otp}</span>
              </div>
              <p style="color:#666;font-size:12px;">If you didn't request this, ignore this email.</p>
            </div>
          `,
          text: `Your TRICCI mobile verification code: ${otp}. Expires in 10 minutes.`,
        });
      }
    }

    res.json({ success: true, message: isEmail ? 'OTP sent to email' : 'OTP sent to your mobile' });
  } catch (err) {
    console.error('otp.send.error', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
}
