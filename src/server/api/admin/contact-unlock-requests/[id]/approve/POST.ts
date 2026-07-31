/**
 * POST /api/admin/contact-unlock-requests/:id/approve
 * Admin-only. Releases the candidate's real contact details to the employer
 * — this is the ONLY place unmasked contact info is returned for a direct
 * application (point 12: admin releases contact info only after payment).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { contactUnlockRequest, candidateProfile, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid request ID' });

    const [reqRow] = await db.select().from(contactUnlockRequest).where(eq(contactUnlockRequest.id, id)).limit(1);
    if (!reqRow) return res.status(404).json({ error: 'Unlock request not found' });
    if (reqRow.status !== 'pending') return res.status(400).json({ error: `Request already ${reqRow.status}` });

    await db
      .update(contactUnlockRequest)
      .set({ status: 'approved', resolvedByUserId: session.user.id, resolvedAt: new Date() })
      .where(eq(contactUnlockRequest.id, id));

    const [candidateInfo] = await db
      .select({ email: user.email, name: user.name, phone: candidateProfile.phone })
      .from(user)
      .leftJoin(candidateProfile, eq(candidateProfile.userId, user.id))
      .where(eq(user.id, reqRow.candidateUserId))
      .limit(1);

    res.json({ ok: true, status: 'approved', candidate: candidateInfo });
  } catch (err) {
    console.error('[admin.contact-unlock-requests.approve] ERROR:', err);
    res.status(500).json({ error: 'Failed to approve unlock request' });
  }
}
