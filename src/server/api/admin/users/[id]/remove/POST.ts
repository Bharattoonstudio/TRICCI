/**
 * POST /api/admin/users/:id/remove
 * Admin only. Removes an account (soft delete). Data is kept, the user is signed out
 * and cannot sign in until restored with POST /api/admin/users/:id/restore.
 *
 * Body: { reason: string }  (5 to 500 characters, required, stored in the audit log)
 * Admins cannot remove themselves or other admin accounts.
 * This never deletes rows. Permanent deletion is not available here.
 */
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { db } from '@/server/db/client.js';
import { user, session, auditLog } from '@/server/db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const authSession = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!authSession) return res.status(401).json({ error: 'Unauthorized' });
    const actor = authSession.user as { id: string; role?: string };
    if (actor.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const id = String(req.params.id ?? '');
    if (!id || id.length > 64) return res.status(400).json({ error: 'Invalid user id' });
    if (id === actor.id) return res.status(400).json({ error: 'You cannot remove your own account' });

    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 5 || reason.length > 500) {
      return res.status(400).json({ error: 'Please give a reason (5 to 500 characters)' });
    }

    const [target] = await db.select({ id: user.id, role: user.role, removedAt: user.removedAt })
      .from(user).where(eq(user.id, id)).limit(1);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'admin') return res.status(400).json({ error: 'Admin accounts cannot be removed here' });
    if (target.removedAt) return res.status(400).json({ error: 'This account is already removed' });

    await db.update(user).set({ removedAt: new Date(), updatedAt: new Date() }).where(eq(user.id, id));
    await db.delete(session).where(eq(session.userId, id));
    await db.insert(auditLog).values({
      entityType: 'user',
      entityId: id,
      action: 'remove',
      actorUserId: actor.id,
      actorRole: 'admin',
      metadata: { reason },
    });

    return res.status(200).json({ message: 'Account removed. The user has been signed out and cannot sign in. Data is kept and the account can be restored.' });
  } catch (error) {
    console.error('[admin/users/:id/remove] error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not remove this account' });
  }
}
