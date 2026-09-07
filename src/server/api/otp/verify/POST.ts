/**
 * POST /api/otp/verify
 * Body: { identifier: string, otp: string, purpose: 'verify' | '2fa' }
 * Verifies the OTP and marks mobile as verified if purpose='verify'.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { otpStore, candidateProfile } from '@/server/db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { identifier, otp, purpose = 'verify' } = req.body as {
      identifier?: string; otp?: string; purpose?: string;
    };
    if (!identifier || !otp) return res.status(400).json({ error: 'identifier and otp are required' });

    const now = new Date();
    const [record] = await db.select().from(otpStore)
      .where(and(
        eq(otpStore.identifier, identifier),
        eq(otpStore.otp, otp),
        eq(otpStore.purpose, purpose),
        eq(otpStore.verified, false),
        gt(otpStore.expiresAt, now),
      ));

    if (!record) return res.status(400).json({ error: 'Invalid or expired OTP' });

    // Mark as used
    await db.update(otpStore).set({ verified: true }).where(eq(otpStore.id, record.id));

    // If verifying a phone number, mark mobileVerified on candidate profile
    if (purpose === 'verify' && !identifier.includes('@')) {
      await db.update(candidateProfile)
        .set({ mobileVerified: true, phone: identifier })
        .where(eq(candidateProfile.userId, session.user.id));
    }

    res.json({ success: true, verified: true });
  } catch (err) {
    console.error('otp.verify.error', err);
    res.status(500).json({ error: 'Verification failed' });
  }
}
