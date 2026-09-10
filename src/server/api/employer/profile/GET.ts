/**
 * GET /api/employer/profile
 * Returns the authenticated employer's company profile.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { employerProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const [profile] = await db
      .select()
      .from(employerProfile)
      .where(eq(employerProfile.userId, session.user.id))
      .limit(1);

    res.json(profile ?? { companyName: null, industry: null, website: null });
  } catch (err) {
    console.error('employer.profile.get.error', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}
