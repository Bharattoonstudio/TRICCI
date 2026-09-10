/**
 * GET /api/employer/placements/:id/joining
 * Returns the Joining Tracker state for a placement — only meaningful
 * once the offer has been accepted (joiningDate set); returns the data
 * either way so the UI can show an appropriate empty state.
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

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid placement ID' });

    const [row] = await db.select().from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });
    if (role === 'employer' && row.employerUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your placement' });
    }

    res.json({
      candidateName: row.candidateName,
      jobTitle: row.jobTitle,
      offerStatus: row.offerStatus,
      joiningDate: row.joiningDate,
      bgvStatus: row.bgvStatus,
      bgvNote: row.bgvNote,
      documentsChecklist: row.documentsChecklist,
      inductionCompleted: row.inductionCompleted,
      actualJoiningConfirmed: row.actualJoiningConfirmed,
      joiningNote: row.joiningNote,
    });
  } catch (err) {
    console.error('[employer.placements.joining.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch joining tracker' });
  }
}
