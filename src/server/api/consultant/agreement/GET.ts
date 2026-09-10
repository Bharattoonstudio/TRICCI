/**
 * GET /api/consultant/agreement
 * Returns whether the current consultant has signed the agreement.
 */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { db } from '@/server/db/client.js';
import { consultantProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const [profile] = await db
      .select({
        agreementSignedAt: consultantProfile.agreementSignedAt,
        agencyName: consultantProfile.agencyName,
        signatoryName: consultantProfile.signatoryName,
        designation: consultantProfile.designation,
      })
      .from(consultantProfile)
      .where(eq(consultantProfile.userId, session.user.id))
      .limit(1);

    if (!profile) {
      return res.json({ signed: false });
    }

    res.json({
      signed: !!profile.agreementSignedAt,
      signedAt: profile.agreementSignedAt,
      agencyName: profile.agencyName,
      signatoryName: profile.signatoryName,
      designation: profile.designation,
    });
  } catch (err) {
    console.error('[GET /api/consultant/agreement]', err);
    res.status(500).json({ error: 'Failed to fetch agreement status' });
  }
}
