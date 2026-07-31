/**
 * POST /api/candidate/agreement
 * Records the candidate's digital acceptance of the TRICCI T&C.
 * Body: { signatoryName }
 */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { db } from '@/server/db/client.js';
import { candidateProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

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

    const { signatoryName } = req.body as { signatoryName?: string };
    if (!signatoryName?.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const ip = getClientIp(req);
    const signedAt = new Date();
    const hash = createHash('sha256')
      .update(`${session.user.id}|${signatoryName.trim()}|${signedAt.toISOString()}|${ip}`)
      .digest('hex');

    const [existing] = await db
      .select({ id: candidateProfile.id })
      .from(candidateProfile)
      .where(eq(candidateProfile.userId, session.user.id))
      .limit(1);

    if (existing) {
      await db
        .update(candidateProfile)
        .set({ signatoryName: signatoryName.trim(), agreementSignedAt: signedAt, agreementIp: ip, agreementHash: hash })
        .where(eq(candidateProfile.userId, session.user.id));
    } else {
      await db.insert(candidateProfile).values({
        userId: session.user.id,
        signatoryName: signatoryName.trim(),
        agreementSignedAt: signedAt,
        agreementIp: ip,
        agreementHash: hash,
      });
    }

    res.json({ success: true, signedAt: signedAt.toISOString(), hash, ip });
  } catch (err) {
    console.error('[POST /api/candidate/agreement]', err);
    res.status(500).json({ error: 'Failed to record agreement' });
  }
}
