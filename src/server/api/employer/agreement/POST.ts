/**
 * POST /api/employer/agreement
 * Records the employer's digital acceptance of the TRICCI T&C.
 * Body: { signatoryName, designation }
 */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { db } from '@/server/db/client.js';
import { employerProfile } from '@/server/db/schema.js';
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

    const { signatoryName, designation } = req.body as { signatoryName?: string; designation?: string };
    if (!signatoryName?.trim() || !designation?.trim()) {
      return res.status(400).json({ error: 'Signatory name and designation are required' });
    }

    const ip = getClientIp(req);
    const signedAt = new Date();
    const hash = createHash('sha256')
      .update(`${session.user.id}|${signatoryName.trim()}|${designation.trim()}|${signedAt.toISOString()}|${ip}`)
      .digest('hex');

    const [existing] = await db
      .select({ id: employerProfile.id })
      .from(employerProfile)
      .where(eq(employerProfile.userId, session.user.id))
      .limit(1);

    if (existing) {
      await db
        .update(employerProfile)
        .set({
          signatoryName: signatoryName.trim(),
          designation: designation.trim(),
          agreementSignedAt: signedAt,
          agreementIp: ip,
          agreementHash: hash,
        })
        .where(eq(employerProfile.userId, session.user.id));
    } else {
      await db.insert(employerProfile).values({
        userId: session.user.id,
        signatoryName: signatoryName.trim(),
        designation: designation.trim(),
        agreementSignedAt: signedAt,
        agreementIp: ip,
        agreementHash: hash,
      });
    }

    res.json({ success: true, signedAt: signedAt.toISOString(), hash, ip });
  } catch (err) {
    console.error('[POST /api/employer/agreement]', err);
    res.status(500).json({ error: 'Failed to record agreement' });
  }
}
