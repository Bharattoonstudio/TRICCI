/**
 * POST /api/admin/users/:id/restore
 * Admin only. Restores a removed account so the user can sign in again.
 * Recorded in the audit log.
 */
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { db } from '@/server/db/client.js';
import { user, auditLog } from '@/server/db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const authSession = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!authSession) return res.status(401).json({ error: 'Unauthorized' });
    const actor = authSession.user as { id: string; role?: string };
    if (actor.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const id = String(req.params.id ?? '');
    if (!id || id.length > 64) return res.status(400).json({ error: 'Invalid user id' });

    const [target] = await db.select({ id: user.id, removedAt: user.removedAt })
      .from(user).where(eq(user.id, id)).limit(1);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (!target.removedAt) return res.status(400).json({ error: 'This account is not removed' });

    await db.update(user).set({ removedAt: null, updatedAt: new Date() }).where(eq(user.id, id));
    await db.insert(auditLog).values({
      entityType: 'user',
      entityId: id,
      action: 'restore',
      actorUserId: actor.id,
      actorRole: 'admin',
      metadata: null,
    });

    return res.status(200).json({ message: 'Account restored. The user can sign in again.' });
  } catch (error) {
    console.error('[admin/users/:id/restore] error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not restore this account' });
  }
}
