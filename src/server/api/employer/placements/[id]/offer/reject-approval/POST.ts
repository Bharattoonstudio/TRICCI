/**
 * POST /api/employer/placements/:id/offer/reject-approval
 * A team_lead or owner sends a pending offer back to draft with a note
 * explaining what needs to change.
 * Body: { note: string }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement, notification } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { getOrgUserIds, getOrgRole, canApproveOffers } from '@/server/lib/orgPermissions.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid placement ID' });

    const { note } = req.body as { note?: string };
    if (!note?.trim()) return res.status(400).json({ error: 'A reason is required so the requester knows what to fix' });

    const [row] = await db.select().from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });

    const orgUserIds = await getOrgUserIds(session.user.id);
    if (role === 'employer' && (!row.employerUserId || !orgUserIds.includes(row.employerUserId))) {
      return res.status(403).json({ error: 'Not your placement' });
    }
    if (role === 'employer') {
      const myRole = await getOrgRole(session.user.id);
      if (!canApproveOffers(myRole)) {
        return res.status(403).json({ error: 'Only a team lead or owner can approve or reject offers' });
      }
    }
    if (row.offerApprovalStatus !== 'pending_approval') {
      return res.status(400).json({ error: 'This offer is not pending approval' });
    }

    await db.update(placement).set({
      offerApprovalStatus: 'draft',
      offerApprovalNote: note.trim(),
    }).where(eq(placement.id, id));

    if (row.offerApprovalRequestedBy) {
      await db.insert(notification).values({
        userId: row.offerApprovalRequestedBy,
        type: 'offer_rejected',
        message: `Your offer for ${row.candidateName} (${row.jobTitle}) needs changes: ${note.trim()}`,
        link: '/employer/dashboard',
      }).catch(() => {});
    }

    res.json({ ok: true, offerApprovalStatus: 'draft' });
  } catch (err) {
    console.error('[employer.placements.offer.reject-approval] ERROR:', err);
    res.status(500).json({ error: 'Failed to reject offer' });
  }
}
