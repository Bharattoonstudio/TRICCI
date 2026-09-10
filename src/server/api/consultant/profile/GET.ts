/**
 * GET /api/consultant/profile
 * Returns the consultant's specialisation, years of experience, and
 * industries dropdowns (points 23-24).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const [profile] = await db
      .select({
        specialisation: consultantProfile.specialisation,
        yearsExperience: consultantProfile.yearsExperience,
        industriesExpertise: consultantProfile.industriesExpertise,
        industriesInterested: consultantProfile.industriesInterested,
      })
      .from(consultantProfile)
      .where(eq(consultantProfile.userId, session.user.id))
      .limit(1);

    res.json(profile ?? { specialisation: null, yearsExperience: null, industriesExpertise: [], industriesInterested: [] });
  } catch (err) {
    console.error('[GET /api/consultant/profile]', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}
