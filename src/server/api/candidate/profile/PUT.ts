import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

function calcCompletion(p: Record<string, unknown>): number {
  const fields = [
    'currentTitle', 'location', 'phone', 'summary',
    'currentCTC', 'expectedCTC', 'noticePeriod', 'totalExperience',
    'skills', 'experience', 'education', 'cvUrl',
  ];
  const filled = fields.filter(f => {
    const v = p[f];
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }).length;
  return Math.round((filled / fields.length) * 100);
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const userId = session.user.id;
    const body = req.body as Record<string, unknown>;

    // Whitelist updatable fields
    const allowed = [
      'currentTitle', 'location', 'phone', 'summary',
      'currentCTC', 'expectedCTC', 'noticePeriod', 'totalExperience',
      'skills', 'experience', 'education',
      'cvUrl', 'cvFileName', 'cvUploadedAt',
      'visibility',
    ];

    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    update.profileComplete = calcCompletion({ ...update, ...body });

    await db.update(candidateProfile)
      .set(update as Partial<typeof candidateProfile.$inferInsert>)
      .where(eq(candidateProfile.userId, userId));

    const [updated] = await db.select().from(candidateProfile)
      .where(eq(candidateProfile.userId, userId));

    res.json({ profile: updated });
  } catch (err) {
    console.error('candidate.profile.put.error', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
}
