import { Request, Response } from 'express';
import { db } from '@/server/db/client';
import { auditLog, user } from '@/server/db/schema';
import { eq, like, and, gte, lte, desc } from 'drizzle-orm';

interface AuditLogQuery {
  page?: number;
  limit?: number;
  action?: string;
  adminId?: string;
  targetId?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export default async function GET(req: Request, res: Response) {
  try {
    // Verify admin
    const userId = req.user?.id;
    const adminUser = await db.query.user.findFirst({
      where: eq(user.id, userId!),
    });

    if (adminUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const {
      page = 1,
      limit = 100,
      action,
      adminId: filteredAdminId,
      targetId,
      targetType,
      dateFrom,
      dateTo,
      search,
    } = req.query as AuditLogQuery;

    const pageNum = Math.max(1, parseInt(page as any) || 1);
    const limitNum = Math.min(parseInt(limit as any) || 100, 500);
    const offset = (pageNum - 1) * limitNum;

    // Build filters
    const filters: any[] = [];

    if (action) {
      filters.push(eq(auditLog.action, action as string));
    }

    if (filteredAdminId) {
      filters.push(eq(auditLog.adminId, filteredAdminId as string));
    }

    if (targetId) {
      filters.push(eq(auditLog.targetId, targetId as string));
    }

    if (targetType) {
      filters.push(eq(auditLog.targetType, targetType as string));
    }

    if (dateFrom) {
      filters.push(gte(auditLog.timestamp, new Date(dateFrom as string)));
    }

    if (dateTo) {
      filters.push(lte(auditLog.timestamp, new Date(dateTo as string)));
    }

    // Fetch logs with optional admin user information
    let query = db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        adminId: auditLog.adminId,
        adminEmail: users.email,
        targetId: auditLog.targetId,
        targetType: auditLog.targetType,
        details: auditLog.details,
        ip: auditLog.ip,
        timestamp: auditLog.timestamp,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.adminId, users.id))
      .orderBy(desc(auditLog.timestamp))
      .limit(limitNum)
      .offset(offset);

    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    const logs = await query;

    // Get total count
    let countQuery = db.select({ count: 'count' }).from(auditLog);
    if (filters.length > 0) {
      countQuery = countQuery.where(and(...filters));
    }
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;

    // Format response with enhanced details
    const formattedLogs = logs.map((log) => ({
      ...log,
      description: getActionDescription(log.action, log.details),
      severity: getActionSeverity(log.action),
      timestamp: log.timestamp,
      timeAgo: getTimeAgo(log.timestamp),
    }));

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      filters: {
        action,
        adminId: filteredAdminId,
        targetId,
        targetType,
        dateFrom,
        dateTo,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}

// Export audit logs as CSV
export async function exportAuditLogs(req: Request, res: Response) {
  try {
    // Verify admin
    const userId = req.user?.id;
    const adminUser = await db.query.user.findFirst({
      where: eq(user.id, userId!),
    });

    if (adminUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const logs = await db
      .select({
        timestamp: auditLog.timestamp,
        action: auditLog.action,
        admin: users.email,
        targetId: auditLog.targetId,
        targetType: auditLog.targetType,
        ip: auditLog.ip,
        details: auditLog.details,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.adminId, users.id))
      .where(gte(auditLog.timestamp, startDate))
      .orderBy(desc(auditLog.timestamp));

    // Convert to CSV
    const csv = convertToCSV(logs);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
}

// UTILITY FUNCTIONS

function getActionDescription(action: string, details: any): string {
  const descriptions: Record<string, (details: any) => string> = {
    USER_SUSPENDED: (d) => `Suspended user: ${d?.email || d?.userId}`,
    USER_UNSUSPENDED: (d) => `Restored user: ${d?.email || d?.userId}`,
    USER_DELETED: (d) => `Deleted user: ${d?.originalEmail || d?.userId}`,
    BULK_SUSPEND: (d) => `Bulk suspended ${d?.count} users`,
    BULK_ACTIVATE: (d) => `Bulk activated ${d?.count} users`,
    BULK_DELETE: (d) => `Bulk deleted ${d?.count} users`,
    ADMIN_CREATED: (d) => `Created admin: ${d?.email}`,
    JOB_REMOVED: (d) => `Removed job: ${d?.jobTitle}`,
    JOB_FEATURED: (d) => `Featured job: ${d?.jobTitle}`,
    CONTENT_UPDATED: (d) => `Updated content: ${d?.contentType}`,
    SETTINGS_CHANGED: (d) => `Changed settings: ${d?.setting}`,
    PLACEMENT_VERIFIED: (d) => `Verified placement: ${d?.placementId}`,
    PAYMENT_PROCESSED: (d) => `Processed payment: ₹${d?.amount}`,
    DEFAULT: (d) => action.replace(/_/g, ' ').toLowerCase(),
  };

  const descFunc = descriptions[action] || descriptions.DEFAULT;
  return descFunc(details);
}

function getActionSeverity(
  action: string
): 'critical' | 'high' | 'medium' | 'low' {
  if (action.includes('DELETE') || action.includes('SUSPEND')) {
    return 'critical';
  }
  if (action.includes('ADMIN') || action.includes('SETTINGS')) {
    return 'high';
  }
  if (action.includes('FEATURED') || action.includes('VERIFIED')) {
    return 'medium';
  }
  return 'low';
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}
