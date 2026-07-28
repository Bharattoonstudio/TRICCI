import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { otpStore } from '@/server/db/schema.js';
import { eq, and, gt } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const { phone, email, otp, purpose = 'signup_mobile' } = req.body as {
      phone?: string;
      email?: string;
      otp?: string;
      purpose?: string;
    };

    if (!otp) {
      return res.status(400).json({ error: 'otp is required.' });
    }
    if (!email && !phone) {
      return res.status(400).json({ error: 'email or phone is required.' });
    }

    // identifier must match exactly what send-public wrote
    const identifier = email
      ? `email:${email.toLowerCase().trim()}`
      : `phone:${phone}`;

    const now = new Date();

    const rows = await db
      .select()
      .from(otpStore)
      .where(
        and(
          eq(otpStore.identifier, identifier),
          eq(otpStore.otp, otp),
          eq(otpStore.purpose, purpose),
          eq(otpStore.verified, false),   // prevent reuse of already-consumed OTPs
          gt(otpStore.expiresAt, now),
        ),
      )
      .limit(1);

    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }

    // Mark as used immediately (delete to keep table clean)
    await db.delete(otpStore).where(eq(otpStore.id, rows[0].id));

    console.log(`[otp.verify-public] OTP verified for identifier: ${identifier}`);
    res.json({ success: true, verified: true });
  } catch (err) {
    console.error('[otp.verify-public] ERROR:', err);
    res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
  }
}
