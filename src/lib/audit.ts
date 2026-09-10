/**
 * Lightweight audit trail helper. Call this from mutation endpoints to
 * record who did what, when. Never throws — a logging failure must never
 * break the underlying request.
 */
import { db } from '@/server/db/client.js';
import { auditLog } from '@/server/db/schema.js';

export interface AuditEntry {
  entityType: string;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, unknown>;
}

export function logAudit(entry: AuditEntry): void {
  db.insert(auditLog).values({
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    actorUserId: entry.actorUserId ?? null,
    actorRole: entry.actorRole ?? null,
    metadata: entry.metadata ?? null,
  }).catch(err => {
    console.error(`[audit] failed to log ${entry.action} for ${entry.entityType}:${entry.entityId}`, err);
  });
}
