/**
 * GET /api/employer/placements/by-application/:applicationId
 * Looks up the placement record for a given direct candidate application —
 * used to open offer management from a "Selected" pipeline card. Returns
 * null if no placement exists yet (e.g. status hasn't reached 'placed').
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const applicationId = parseInt(String(req.params.applicationId), 10);
    if (isNaN(applicationId)) return res.status(400).json({ error: 'Invalid application ID' });

    const [row] = await db
      .select()
      .from(placement)
      .where(eq(placement.applicationId, applicationId))
      .limit(1);

    if (!row) return res.json({ placement: null });
    if (role === 'employer' && row.employerUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your placement' });
    }

    res.json({ placement: row });
  } catch (err) {
    console.error('[employer.placements.by-application] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch placement' });
  }
}
