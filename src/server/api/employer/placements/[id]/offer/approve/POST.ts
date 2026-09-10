/**
 * POST /api/employer/placements/:id/offer/approve
 * A team_lead or owner approves a pending offer -- this both marks it
 * approved AND actually sends it (same dispatch as the direct flow).
 * Restricted to roles that can approve (owner, team_lead).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement, notification } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { getOrgUserIds, getOrgRole, canApproveOffers } from '@/server/lib/orgPermissions.js';
import { dispatchOffer } from '@/server/lib/dispatchOffer.js';

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
    if (role === 'employer') {
      const myRole = await getOrgRole(session.user.id);
      if (!canApproveOffers(myRole)) {
        return res.status(403).json({ error: 'Only a team lead or owner can approve offers' });
      }
    }
    if (row.offerApprovalStatus !== 'pending_approval') {
      return res.status(400).json({ error: 'This offer is not pending approval' });
    }
    if (!row.offerCtcLpa || !row.offerExpiryDate) {
      return res.status(400).json({ error: 'Draft is missing CTC or expiry date' });
    }

    await db.update(placement).set({
      offerApprovalStatus: 'approved',
      offerApprovedBy: session.user.id,
    }).where(eq(placement.id, id));

    await dispatchOffer(row, row.offerCtcLpa, row.offerExpiryDate.toISOString(), row.offerNote ?? undefined);

    if (row.offerApprovalRequestedBy) {
      await db.insert(notification).values({
        userId: row.offerApprovalRequestedBy,
        type: 'offer_approved',
        message: `Your offer for ${row.candidateName} (${row.jobTitle}) was approved and sent`,
        link: '/employer/dashboard',
      }).catch(() => {});
    }

    res.json({ ok: true, offerApprovalStatus: 'approved', offerStatus: 'sent' });
  } catch (err) {
    console.error('[employer.placements.offer.approve] ERROR:', err);
    res.status(500).json({ error: 'Failed to approve offer' });
  }
}
