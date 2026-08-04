/**
 * POST /api/admin/contact-unlock-requests/:id/deny
 * Admin-only. Denies a contact unlock request (e.g. payment not received).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { contactUnlockRequest, notification } from '@/server/db/schema.js';
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

    const [reqRow] = await db.select({ status: contactUnlockRequest.status, employerUserId: contactUnlockRequest.employerUserId }).from(contactUnlockRequest).where(eq(contactUnlockRequest.id, id)).limit(1);
    if (!reqRow) return res.status(404).json({ error: 'Unlock request not found' });
    if (reqRow.status !== 'pending') return res.status(400).json({ error: `Request already ${reqRow.status}` });

    await db
      .update(contactUnlockRequest)
      .set({ status: 'denied', resolvedByUserId: session.user.id, resolvedAt: new Date() })
      .where(eq(contactUnlockRequest.id, id));

    await db.insert(notification).values({
      userId: reqRow.employerUserId,
      type: 'contact_unlock_denied',
      message: 'A candidate contact unlock request was denied',
      link: '/employer/dashboard',
    }).catch(() => {});

    res.json({ ok: true, status: 'denied' });
  } catch (err) {
    console.error('[admin.contact-unlock-requests.deny] ERROR:', err);
    res.status(500).json({ error: 'Failed to deny unlock request' });
  }
}
