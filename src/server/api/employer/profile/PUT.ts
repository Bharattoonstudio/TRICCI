/**
 * PUT /api/employer/profile
 * Creates or updates the authenticated employer's company profile.
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

    const { companyName, industry, website } = req.body as {
      companyName?: string;
      industry?: string;
      website?: string;
    };

    if (!companyName?.trim()) {
      return res.status(400).json({ error: 'Company name is required' });
    }

    // Upsert — insert if not exists, update if exists
    const [existing] = await db
      .select({ id: employerProfile.id })
      .from(employerProfile)
      .where(eq(employerProfile.userId, session.user.id))
      .limit(1);

    if (existing) {
      await db.update(employerProfile)
        .set({
          companyName: companyName.trim(),
          industry: industry?.trim() || null,
          website: website?.trim() || null,
        })
        .where(eq(employerProfile.userId, session.user.id));
    } else {
      await db.insert(employerProfile).values({
        userId: session.user.id,
        companyName: companyName.trim(),
        industry: industry?.trim() || null,
        website: website?.trim() || null,
      });
    }

    res.json({ ok: true, companyName: companyName.trim() });
  } catch (err) {
    console.error('employer.profile.put.error', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
}
