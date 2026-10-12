/**
 * GET /api/admin/users
 * Admin only. Lists accounts for the admin dashboard (newest first, max 500).
 *
 * Read-only. Passwords and session tokens are never selected.
 * status is "suspended" when an admin has paused the account, otherwise "active".
 * activityScore is 0 for now, because it is not calculated yet.
 */
import type { Request, Response } from 'express';
import { desc, max } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { db } from '@/server/db/client.js';
import { user, session } from '@/server/db/schema.js';

const LIMIT = 500;

export default async function handler(req: Request, res: Response) {
  try {
    const authSession = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!authSession) return res.status(401).json({ error: 'Unauthorized' });
    if ((authSession.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [rows, lastSeen] = await Promise.all([
      db
        .select({ id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt, suspendedAt: user.suspendedAt })
        .from(user)
        .orderBy(desc(user.createdAt))
        .limit(LIMIT),
      db.select({ userId: session.userId, lastLogin: max(session.createdAt) }).from(session).groupBy(session.userId),
    ]);

    const lastLoginByUser = new Map(lastSeen.map((s) => [s.userId, s.lastLogin]));

    return res.status(200).json(
      rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.suspendedAt ? 'suspended' : 'active',
        joinedDate: u.createdAt,
        lastLogin: lastLoginByUser.get(u.id) ?? null,
        activityScore: 0,
      })),
    );
  } catch (error) {
    console.error('[admin/users] error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not load users' });
  }
}
