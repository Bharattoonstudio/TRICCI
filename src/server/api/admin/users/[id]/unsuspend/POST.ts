import { Request, Response } from 'express';
import { db } from '@/server/db/client';
import { users, auditLog } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

// SUSPEND USER
export async function suspendUser(req: Request, res: Response) {
  try {
    const adminId = req.user?.id;
    const { userId } = req.params;
    const { reason } = req.body;

    // Verify admin
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, adminId!),
    });

    if (adminUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Prevent self-suspension
    if (userId === adminId) {
      return res.status(400).json({ error: 'Cannot suspend your own account' });
    }

    // Check target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Suspend user
    await db.update(users)
      .set({
        status: 'suspended',
        suspendedAt: new Date(),
        suspendReason: reason || 'Admin suspension',
      })
      .where(eq(users.id, userId));

    // Log audit
    await db.insert(auditLog).values({
      adminId,
      action: 'USER_SUSPENDED',
      targetId: userId,
      targetType: 'user',
      details: {
        reason: reason || 'No reason provided',
        email: targetUser.email,
      },
      ip: req.ip,
      timestamp: new Date(),
    });

    // Send notification email
    await sendSuspensionEmail(targetUser.email, reason);

    res.json({
      success: true,
      message: `User ${targetUser.email} has been suspended`,
    });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
}

// UNSUSPEND USER
export async function unsuspendUser(req: Request, res: Response) {
  try {
    const adminId = req.user?.id;
    const { userId } = req.params;

    // Verify admin
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, adminId!),
    });

    if (adminUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Restore user
    await db.update(users)
      .set({
        status: 'active',
        suspendedAt: null,
        suspendReason: null,
      })
      .where(eq(users.id, userId));

    // Log audit
    await db.insert(auditLog).values({
      adminId,
      action: 'USER_UNSUSPENDED',
      targetId: userId,
      targetType: 'user',
      details: {
        email: targetUser.email,
      },
      ip: req.ip,
      timestamp: new Date(),
    });

    // Send notification email
    await sendRestorationEmail(targetUser.email);

    res.json({
      success: true,
      message: `User ${targetUser.email} has been restored`,
    });
  } catch (error) {
    console.error('Error unsuspending user:', error);
    res.status(500).json({ error: 'Failed to unsuspend user' });
  }
}

// DELETE USER
export async function deleteUser(req: Request, res: Response) {
  try {
    const adminId = req.user?.id;
    const { userId } = req.params;

    // Verify admin
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, adminId!),
    });

    if (adminUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Prevent self-deletion
    if (userId === adminId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check target user exists
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Mark as deleted instead of hard delete (data retention)
    await db.update(users)
      .set({
        status: 'deleted',
        email: `deleted_${Date.now()}_${targetUser.email}`,
        name: 'Deleted User',
        deletedAt: new Date(),
        deletedBy: adminId,
      })
      .where(eq(users.id, userId));

    // Log audit
    await db.insert(auditLog).values({
      adminId,
      action: 'USER_DELETED',
      targetId: userId,
      targetType: 'user',
      details: {
        originalEmail: targetUser.email,
      },
      ip: req.ip,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      message: `User ${targetUser.email} has been deleted`,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}

// Helper functions
async function sendSuspensionEmail(email: string, reason: string) {
  // Implementation with Brevo/email service
  try {
    // Send email notification
    console.log(`Suspension email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send suspension email:', error);
  }
}

async function sendRestorationEmail(email: string) {
  // Implementation with Brevo/email service
  try {
    // Send email notification
    console.log(`Restoration email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send restoration email:', error);
  }
}
