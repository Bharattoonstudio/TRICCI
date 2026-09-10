/**
 * GET /api/employer/offers
 * Lists every placement that has entered the internal approval workflow
 * (offerApprovalStatus is set), scoped to the caller's whole
 * organization -- not just jobs they personally posted, since approval
 * is inherently a multi-person flow. Also returns the caller's own org
 * role so the frontend knows whether to show Approve/Reject buttons.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement } from '@/server/db/schema.js';
import { inArray, isNotNull, and, desc } from 'drizzle-orm';
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

    const orgUserIds = await getOrgUserIds(session.user.id);
    const myRole = await getOrgRole(session.user.id);

    const offers = await db.select().from(placement)
      .where(and(inArray(placement.employerUserId, orgUserIds), isNotNull(placement.offerApprovalStatus)))
      .orderBy(desc(placement.id));

    res.json({ offers, canApprove: role === 'admin' || canApproveOffers(myRole) });
  } catch (err) {
    console.error('[employer.offers.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
}
