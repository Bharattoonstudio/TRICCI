/**
 * GET /api/admin/audit-log?entityType=&entityId=&action=&before=&limit=
 * Admin-only. Returns audit log entries, most recent first, with actor names.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { auditLog, user } from '@/server/db/schema.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { eq, and, desc, lt, type SQL } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { entityType, entityId, action, before } = req.query as {
      entityType?: string; entityId?: string; action?: string; before?: string;
    };
    const limitRaw = parseInt(String(req.query.limit ?? '50'), 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;

    const conditions: SQL[] = [];
    if (entityType) conditions.push(eq(auditLog.entityType, entityType));
    if (entityId) conditions.push(eq(auditLog.entityId, entityId));
    if (action) conditions.push(eq(auditLog.action, action));
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) conditions.push(lt(auditLog.createdAt, beforeDate));
    }

    const rows = await db
      .select({
        id: auditLog.id,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        action: auditLog.action,
        actorRole: auditLog.actorRole,
        actorName: user.name,
        actorEmail: user.email,
        metadata: auditLog.metadata,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(user, eq(auditLog.actorUserId, user.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);

    res.json({ entries: rows });
  } catch (err) {
    console.error('[GET /api/admin/audit-log] error', err);
    res.status(500).json({ error: 'Failed to load audit log' });
  }
}
