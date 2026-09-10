import { Request, Response, NextFunction } from 'express';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Admin Authentication Middleware
 * 
 * Protects all /api/admin/* routes by verifying:
 * 1. User is authenticated
 * 2. User has 'admin' role
 * 3. User is not suspended or deleted
 * 
 * Usage in entry.ts:
 * app.use('/api/admin/*', adminAuth);
 */

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email: string;
      };
    }
  }
}

export async function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if user is authenticated
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to access admin features',
      });
      return;
    }

    // Fetch user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access admin features',
        userRole: user.role,
      });
      return;
    }

    // Check if user is suspended or deleted
    if (user.suspendedAt) {
      res.status(403).json({
        success: false,
        error: 'Account suspended',
        message: 'Your admin account has been suspended',
        reason: user.suspendReason || 'No reason provided',
      });
      return;
    }

    if (user.deletedAt) {
      res.status(403).json({
        success: false,
        error: 'Account deleted',
        message: 'Your admin account has been deleted',
      });
      return;
    }

    // Attach admin user to request for logging purposes
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    // Continue to next middleware/route handler
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Helper: Check admin permission for audit logging
 * Usage: const canAudit = await hasAdminAccess(adminId);
 */
export async function hasAdminAccess(userId: string): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return (
      user?.role === 'admin' &&
      !user?.suspendedAt &&
      !user?.deletedAt
    );
  } catch {
    return false;
  }
}

/**
 * Helper: Prevent self-suspension/deletion
 * Usage: checkSelfAction(adminId, targetId, 'suspend')
 */
export function checkSelfAction(
  adminId: string,
  targetId: string,
  action: string
): { allowed: boolean; error?: string } {
  if (adminId === targetId) {
    return {
      allowed: false,
      error: `Admins cannot ${action} themselves. Use another admin account to modify your access.`,
    };
  }
  return { allowed: true };
}

/**
 * Log admin action to audit trail
 * Usage: await logAdminAction(adminId, 'USER_SUSPENDED', targetId, details)
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetId: string | null,
  targetType: string | null,
  details: Record<string, any> = {},
  ipAddress: string = '0.0.0.0',
  userAgent: string = ''
): Promise<void> {
  try {
    // This would insert into audit_log table
    // Implementation depends on your database schema
    const logEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adminId,
      action,
      targetId,
      targetType,
      details,
      ip: ipAddress,
      userAgent: userAgent.substring(0, 500), // Limit length
      timestamp: new Date(),
    };

    // TODO: Insert into audit_log table
    // await db.insert(auditLog).values(logEntry);

    console.log(`[AUDIT] ${action} by ${adminId} on ${targetId}`, details);
  } catch (error) {
    console.error('Error logging admin action:', error);
    // Don't fail the request if audit logging fails
  }
}

/**
 * Extract IP and User-Agent from request
 * Usage: const { ip, userAgent } = getRequestMetadata(req)
 */
export function getRequestMetadata(req: Request): {
  ip: string;
  userAgent: string;
} {
  const ip =
    (req.headers['x-forwarded-for'] as string) ||
    req.socket.remoteAddress ||
    '0.0.0.0';
  const userAgent = req.get('user-agent') || '';

  return { ip, userAgent };
}
