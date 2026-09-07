/**
 * POST /api/consultant/agreement
 * Records the consultant's digital acceptance of the TRICCI agreement.
 * Body: { agencyName, signatoryName, designation }
 */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { db } from '@/server/db/client.js';
import { consultantProfile, job, user } from '@/server/db/schema.js';
import { eq, count } from 'drizzle-orm';
import { createHash } from 'crypto';
import {
  sendAgreementConfirmedEmail,
  sendJobsReadyEmail,
} from '@/server/emails/consultant-onboarding.js';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { agencyName, signatoryName, designation } = req.body as {
      agencyName?: string;
      signatoryName?: string;
      designation?: string;
    };

    if (!agencyName?.trim() || !signatoryName?.trim() || !designation?.trim()) {
      return res.status(400).json({ error: 'Agency name, signatory name, and designation are required' });
    }

    const ip = getClientIp(req);
    const signedAt = new Date();

    // Generate a deterministic hash: SHA-256 of userId + name + timestamp + ip
    const hashInput = `${session.user.id}|${signatoryName.trim()}|${agencyName.trim()}|${signedAt.toISOString()}|${ip}`;
    const hash = createHash('sha256').update(hashInput).digest('hex');

    // Upsert — create profile row if it doesn't exist yet
    const [existing] = await db
      .select({ id: consultantProfile.id })
      .from(consultantProfile)
      .where(eq(consultantProfile.userId, session.user.id))
      .limit(1);

    if (existing) {
      await db
        .update(consultantProfile)
        .set({
          agencyName: agencyName.trim(),
          signatoryName: signatoryName.trim(),
          designation: designation.trim(),
          agreementSignedAt: signedAt,
          agreementIp: ip,
          agreementHash: hash,
        })
        .where(eq(consultantProfile.userId, session.user.id));
    } else {
      await db.insert(consultantProfile).values({
        userId: session.user.id,
        agencyName: agencyName.trim(),
        signatoryName: signatoryName.trim(),
        designation: designation.trim(),
        agreementSignedAt: signedAt,
        agreementIp: ip,
        agreementHash: hash,
      });
    }

    res.json({
      success: true,
      signedAt: signedAt.toISOString(),
      hash,
      ip,
      message: 'Agreement accepted and recorded successfully',
    });

    // Fire onboarding emails after responding (non-blocking)
    setImmediate(async () => {
      try {
        const [userRow] = await db
          .select({ name: user.name, email: user.email })
          .from(user)
          .where(eq(user.id, session.user.id))
          .limit(1);

        if (!userRow) return;

        // Email 3: Agreement confirmed receipt
        await sendAgreementConfirmedEmail(
          userRow.email,
          userRow.name,
          agencyName.trim(),
          hash,
        );

        // Email 4: Jobs ready nudge — count live jobs
        const [{ value: jobCount }] = await db
          .select({ value: count() })
          .from(job)
          .where(eq(job.status, 'active'));

        await sendJobsReadyEmail(userRow.email, userRow.name, jobCount ?? 0);
      } catch (err) {
        console.error('consultant.agreement.onboarding_emails.error', err);
      }
    });
  } catch (err) {
    console.error('[POST /api/consultant/agreement]', err);
    res.status(500).json({ error: 'Failed to record agreement' });
  }
}
