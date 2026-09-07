/**
 * GET /api/communication-log?entityType=job|application|submission&entityId=...
 * Returns the communication timeline for a job, submission, or application,
 * scoped to users who actually have access to that record.
 */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { db } from '@/server/db/client.js';
import { communicationLog, user } from '@/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { canAccessCommunicationLog } from '@/lib/communication-access.js';

const VALID_ENTITY_TYPES = ['job', 'application', 'submission'];

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const role = (session.user as { role?: string }).role;
    const { entityType, entityId } = req.query as { entityType?: string; entityId?: string };

    if (!entityType || !VALID_ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({ error: `entityType must be one of: ${VALID_ENTITY_TYPES.join(', ')}` });
    }
    if (!entityId) return res.status(400).json({ error: 'entityId is required' });

    const allowed = await canAccessCommunicationLog(entityType, entityId, session.user.id, role);
    if (!allowed) return res.status(403).json({ error: 'You do not have access to this record' });

    const rows = await db
      .select({
        id: communicationLog.id,
        type: communicationLog.type,
        message: communicationLog.message,
        createdAt: communicationLog.createdAt,
        createdByUserId: communicationLog.createdByUserId,
        createdByName: user.name,
      })
      .from(communicationLog)
      .leftJoin(user, eq(communicationLog.createdByUserId, user.id))
      .where(and(eq(communicationLog.entityType, entityType), eq(communicationLog.entityId, entityId)))
      .orderBy(desc(communicationLog.createdAt))
      .limit(200);

    res.json({ entries: rows });
  } catch (err) {
    console.error('[GET /api/communication-log] error', err);
    res.status(500).json({ error: 'Failed to load communication log' });
  }
}
