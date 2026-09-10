/**
 * PUT /api/employer/placements/:id/offer/verification
 * Sets the identity/background verification status on a placement.
 * Body: { status: 'pending' | 'verified' | 'failed' }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { getOrgUserIds, isReadOnlyOrgViewer } from '@/server/lib/orgPermissions.js';

const VALID = ['pending', 'verified', 'failed'];

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

    const { status } = req.body as { status?: string };
    if (!status || !VALID.includes(status)) return res.status(400).json({ error: `status must be one of: ${VALID.join(', ')}` });

    const [row] = await db.select({ id: placement.id, employerUserId: placement.employerUserId }).from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });

    if (role === 'employer') {
      const orgUserIds = await getOrgUserIds(session.user.id);
      if (!row.employerUserId || !orgUserIds.includes(row.employerUserId)) {
        return res.status(403).json({ error: 'Not your placement' });
      }
    }

    await db.update(placement).set({ offerVerificationStatus: status }).where(eq(placement.id, id));

    res.json({ ok: true, offerVerificationStatus: status });
  } catch (err) {
    console.error('[employer.placements.offer.verification] ERROR:', err);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
}
