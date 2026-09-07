/**
 * POST /api/communication-log
 * Body: { entityType: 'job'|'application'|'submission', entityId: string, type?: string, message: string }
 * Adds an entry to the communication timeline for a job/application/submission.
 */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { db } from '@/server/db/client.js';
import { communicationLog } from '@/server/db/schema.js';
import { canAccessCommunicationLog } from '@/lib/communication-access.js';
import { logAudit } from '@/lib/audit.js';

const VALID_ENTITY_TYPES = ['job', 'application', 'submission'];
const VALID_TYPES = ['whatsapp', 'email', 'call', 'meeting', 'note'];

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const role = (session.user as { role?: string }).role;
    const { entityType, entityId, type, message } = req.body as {
      entityType?: string; entityId?: string; type?: string; message?: string;
    };

    if (!entityType || !VALID_ENTITY_TYPES.includes(entityType)) {
      return res.status(400).json({ error: `entityType must be one of: ${VALID_ENTITY_TYPES.join(', ')}` });
    }
    if (!entityId) return res.status(400).json({ error: 'entityId is required' });
    if (!message || !message.trim()) return res.status(400).json({ error: 'message is required' });
    if (message.length > 4000) return res.status(400).json({ error: 'message is too long (max 4000 characters)' });

    const noteType = type && VALID_TYPES.includes(type) ? type : 'note';

    const allowed = await canAccessCommunicationLog(entityType, entityId, session.user.id, role);
    if (!allowed) return res.status(403).json({ error: 'You do not have access to this record' });

    const [inserted] = await db.insert(communicationLog).values({
      entityType,
      entityId,
      type: noteType,
      message: message.trim(),
      createdByUserId: session.user.id,
    }).returning({ id: communicationLog.id, createdAt: communicationLog.createdAt });

    logAudit({
      entityType,
      entityId,
      action: 'communication_log.added',
      actorUserId: session.user.id,
      actorRole: role,
      metadata: { type: noteType },
    });

    res.status(201).json({ id: inserted.id, createdAt: inserted.createdAt });
  } catch (err) {
    console.error('[POST /api/communication-log] error', err);
    res.status(500).json({ error: 'Failed to add communication log entry' });
  }
}
