/**
 * Audit Logging Middleware
 * Logs all sensitive actions for compliance and security auditing:
 * - Admin fee approvals
 * - Payment settlements
 * - User suspensions
 * - Data access on invoices
 * - Account changes
 */

import type { Request, Response } from 'express';

// Define audit log entry structure
export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string | null;
  targetId: string | null;
  targetType: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  timestamp: Date;
}

const auditActions = {
  FEE_APPROVED: 'fee_approved',
  FEE_REJECTED: 'fee_rejected',
  PAYMENT_SETTLED: 'payment_settled',
  USER_SUSPENDED: 'user_suspended',
  USER_UNSUSPENDED: 'user_unsuspended',
  INVOICE_GENERATED: 'invoice_generated',
  INVOICE_DOWNLOADED: 'invoice_downloaded',
  PASSWORD_CHANGED: 'password_changed',
  EMAIL_CHANGED: 'email_changed',
  ADMIN_CREATED: 'admin_created',
  DATA_EXPORT: 'data_export',
};

export async function logAuditEvent(
  action: string,
  userId: string | null,
  targetId: string | null,
  targetType: string,
  details: Record<string, unknown>,
  req: Request,
  status: 'success' | 'failure' = 'success'
) {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    // Log to console (will show in Railway logs)
    console.log(JSON.stringify({
      event: 'audit_log',
      action,
      userId,
      targetId,
      targetType,
      details,
      ipAddress,
      userAgent,
      status,
      timestamp: new Date().toISOString(),
    }));

    // TODO: Uncomment after adding audit_log table to schema
    // await db.insert(auditLog).values({
    //   id: generateId(),
    //   action,
    //   userId,
    //   targetId,
    //   targetType,
    //   details,
    //   ipAddress,
    //   userAgent,
    //   status,
    //   timestamp: new Date(),
    // });
  } catch (err) {
    console.error('[audit-log] Failed to log event:', err);
    // Don't throw — audit logging failure shouldn't block the request
  }
}

export const AuditActions = auditActions;

// Example usage in your endpoints:
// await logAuditEvent(
//   AuditActions.FEE_APPROVED,
//   session.user.id,
//   placementId,
//   'placement',
//   { feePercentage: 15, approvedBy: adminId },
//   req,
//   'success'
// );
