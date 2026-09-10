/**
 * POST /api/employer/placements/:id/offer/draft
 * Create or update a draft offer. Doesn't send anything -- this is the
 * first step of the internal approval workflow (draft -> submit for
 * approval -> approved & sent).
 * Body: { offerCtcLpa: number, offerExpiryDate: ISO string, note?: string }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { getOrgUserIds, isReadOnlyOrgViewer } from '@/server/lib/orgPermissions.js';

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

    const { offerCtcLpa, offerExpiryDate, note } = req.body as { offerCtcLpa?: number; offerExpiryDate?: string; note?: string };
    if (!offerCtcLpa || offerCtcLpa <= 0) return res.status(400).json({ error: 'A valid offered CTC is required' });
    if (!offerExpiryDate || isNaN(new Date(offerExpiryDate).getTime())) return res.status(400).json({ error: 'A valid offer expiry date is required' });

    const [row] = await db.select({ id: placement.id, employerUserId: placement.employerUserId, offerStatus: placement.offerStatus })
      .from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });

    if (role === 'employer') {
      const orgUserIds = await getOrgUserIds(session.user.id);
      if (!row.employerUserId || !orgUserIds.includes(row.employerUserId)) {
        return res.status(403).json({ error: 'Not your placement' });
      }
    }
    if (row.offerStatus !== 'not_sent') {
      return res.status(400).json({ error: 'This offer has already been sent — drafts are only for offers not yet sent' });
    }

    await db.update(placement).set({
      offerCtcLpa,
      offerExpiryDate: new Date(offerExpiryDate),
      offerNote: note?.trim() || null,
      offerApprovalStatus: 'draft',
    }).where(eq(placement.id, id));

    res.json({ ok: true, offerApprovalStatus: 'draft' });
  } catch (err) {
    console.error('[employer.placements.offer.draft] ERROR:', err);
    res.status(500).json({ error: 'Failed to save draft' });
  }
}
