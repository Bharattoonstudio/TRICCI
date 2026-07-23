import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateProfile, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const userId = session.user.id;

    // Get user name/email too
    const [u] = await db.select({ name: user.name, email: user.email })
      .from(user).where(eq(user.id, userId));

    const [profile] = await db.select().from(candidateProfile)
      .where(eq(candidateProfile.userId, userId));

    if (!profile) {
      // Auto-create empty profile
      await db.insert(candidateProfile).values({ userId });
      return res.json({ profile: { userId }, user: u });
    }

    res.json({ profile, user: u });
  } catch (err) {
    console.error('candidate.profile.get.error', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
}
