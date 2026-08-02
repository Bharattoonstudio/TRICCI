/**
 * PUT /api/consultant/profile
 * Updates the consultant's specialisation, years of experience, and
 * industries dropdowns (points 23-24). Upserts if no profile row exists yet.
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

    const { specialisation, yearsExperience, industriesExpertise, industriesInterested } = req.body as {
      specialisation?: string;
      yearsExperience?: number;
      industriesExpertise?: string[];
      industriesInterested?: string[];
    };

    if (industriesExpertise && !Array.isArray(industriesExpertise)) {
      return res.status(400).json({ error: 'industriesExpertise must be an array' });
    }
    if (industriesInterested && !Array.isArray(industriesInterested)) {
      return res.status(400).json({ error: 'industriesInterested must be an array' });
    }

    const update = {
      ...(specialisation !== undefined ? { specialisation: specialisation?.trim() || null } : {}),
      ...(yearsExperience !== undefined ? { yearsExperience: Number(yearsExperience) || null } : {}),
      ...(industriesExpertise !== undefined ? { industriesExpertise } : {}),
      ...(industriesInterested !== undefined ? { industriesInterested } : {}),
    };

    const [existing] = await db
      .select({ id: consultantProfile.id })
      .from(consultantProfile)
      .where(eq(consultantProfile.userId, session.user.id))
      .limit(1);

    if (existing) {
      await db.update(consultantProfile).set(update).where(eq(consultantProfile.userId, session.user.id));
    } else {
      await db.insert(consultantProfile).values({ userId: session.user.id, ...update });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[PUT /api/consultant/profile]', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}
