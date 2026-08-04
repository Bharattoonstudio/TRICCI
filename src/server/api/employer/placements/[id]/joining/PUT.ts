/**
 * PUT /api/employer/placements/:id/joining
 * Updates the Joining Tracker — BGV status/note, documents checklist
 * (toggle received per item), induction completion, and final actual
 * joining confirmation. Uses read-only-viewer enforcement like other
 * employer write actions from Phase W.
 * Body: any subset of { bgvStatus, bgvNote, documentsChecklist,
 *   inductionCompleted, actualJoiningConfirmed, joiningNote }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { isReadOnlyOrgViewer } from '@/server/lib/orgPermissions.js';

const VALID_BGV_STATUSES = ['pending', 'in_progress', 'cleared', 'flagged'];

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });
    if (role === 'employer' && await isReadOnlyOrgViewer(session.user.id)) {
      return res.status(403).json({ error: 'read_only', message: 'Viewer accounts have read-only access' });
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid placement ID' });

    const { bgvStatus, bgvNote, documentsChecklist, inductionCompleted, actualJoiningConfirmed, joiningNote } = req.body as {
      bgvStatus?: string; bgvNote?: string; documentsChecklist?: { label: string; received: boolean }[];
      inductionCompleted?: boolean; actualJoiningConfirmed?: boolean; joiningNote?: string;
    };

    if (bgvStatus !== undefined && !VALID_BGV_STATUSES.includes(bgvStatus)) {
      return res.status(400).json({ error: `bgvStatus must be one of: ${VALID_BGV_STATUSES.join(', ')}` });
    }

    const [row] = await db.select({ employerUserId: placement.employerUserId }).from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });
    if (role === 'employer' && row.employerUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your placement' });
    }

    await db.update(placement).set({
      ...(bgvStatus !== undefined ? { bgvStatus } : {}),
      ...(bgvNote !== undefined ? { bgvNote: bgvNote.trim() || null } : {}),
      ...(documentsChecklist !== undefined ? { documentsChecklist } : {}),
      ...(inductionCompleted !== undefined ? { inductionCompleted } : {}),
      ...(actualJoiningConfirmed !== undefined ? { actualJoiningConfirmed } : {}),
      ...(joiningNote !== undefined ? { joiningNote: joiningNote.trim() || null } : {}),
    }).where(eq(placement.id, id));

    res.json({ ok: true });
  } catch (err) {
    console.error('[employer.placements.joining.put] ERROR:', err);
    res.status(500).json({ error: 'Failed to update joining tracker' });
  }
}
