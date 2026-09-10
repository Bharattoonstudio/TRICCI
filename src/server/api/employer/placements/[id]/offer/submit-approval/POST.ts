/**
 * POST /api/employer/placements/:id/offer/submit-approval
 * Moves a draft offer to pending_approval and notifies everyone on the
 * team who can approve (owner + team_lead).
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

    const [row] = await db.select().from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });

    const orgUserIds = await getOrgUserIds(session.user.id);
    if (role === 'employer' && (!row.employerUserId || !orgUserIds.includes(row.employerUserId))) {
      return res.status(403).json({ error: 'Not your placement' });
    }
    if (row.offerApprovalStatus !== 'draft') {
      return res.status(400).json({ error: 'Only a draft offer can be submitted for approval' });
    }

    await db.update(placement).set({
      offerApprovalStatus: 'pending_approval',
      offerApprovalRequestedBy: session.user.id,
      offerApprovalNote: null,
    }).where(eq(placement.id, id));

    // Notify everyone in the org who can approve, excluding the requester themselves
    const approverIds: string[] = [];
    for (const uid of orgUserIds) {
      if (uid === session.user.id) continue;
      const r = await getOrgRole(uid);
      if (canApproveOffers(r)) approverIds.push(uid);
    }
    await Promise.allSettled(approverIds.map(uid => db.insert(notification).values({
      userId: uid,
      type: 'offer_approval_needed',
      message: `Offer for ${row.candidateName} (${row.jobTitle}) needs your approval`,
      link: '/employer/dashboard',
    }).catch(() => {})));

    res.json({ ok: true, offerApprovalStatus: 'pending_approval' });
  } catch (err) {
    console.error('[employer.placements.offer.submit-approval] ERROR:', err);
    res.status(500).json({ error: 'Failed to submit for approval' });
  }
}
