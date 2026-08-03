/**
 * POST /api/employer/placements/:id/offer/respond
 * Records the candidate's response to a sent offer. NOTE: this is
 * employer-recorded, not a self-service candidate portal action — true
 * candidate self-acceptance (with e-signature) is a larger separate build,
 * flagged rather than faked here.
 * Body: { response: 'accepted' | 'declined', joiningDate?: ISO string }
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

    const { response, joiningDate } = req.body as { response?: 'accepted' | 'declined'; joiningDate?: string };
    if (response !== 'accepted' && response !== 'declined') {
      return res.status(400).json({ error: 'response must be "accepted" or "declined"' });
    }

    const [row] = await db.select({ employerUserId: placement.employerUserId, offerStatus: placement.offerStatus }).from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });
    if (role === 'employer' && row.employerUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your placement' });
    }
    if (row.offerStatus !== 'sent') {
      return res.status(400).json({ error: `Cannot respond — offer status is "${row.offerStatus}"` });
    }

    await db.update(placement).set({
      offerStatus: response,
      offerRespondedAt: new Date(),
      ...(response === 'accepted' && joiningDate && !isNaN(new Date(joiningDate).getTime()) ? { joiningDate: new Date(joiningDate) } : {}),
    }).where(eq(placement.id, id));

    res.json({ ok: true, offerStatus: response });
  } catch (err) {
    console.error('[employer.placements.offer.respond] ERROR:', err);
    res.status(500).json({ error: 'Failed to record offer response' });
  }
}
