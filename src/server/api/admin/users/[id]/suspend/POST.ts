import { Request, Response } from 'express';
import { db } from '@/server/db/client';
import { user, auditLog } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

export default async function suspendUser(req: Request, res: Response) {
  try {
    const adminId = req.user?.id;
    const { id: userId } = req.params;
    const { reason } = req.body;

    // Verify admin
    const adminUser = await db.query.user.findFirst({
      where: eq(user.id, adminId!),
    });

    if (adminUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Prevent self-suspension
    if (userId === adminId) {
      return res.status(400).json({ error: 'Cannot suspend your own account' });
    }

    // Check target user exists
    const targetUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Suspend user
    await db.update(user)
      .set({
        suspendedAt: new Date(),
        suspend_reason: reason || 'Admin suspension'
      })
      .where(eq(user.id, userId));

    // Log action
    await db.insert(auditLog).values({
      id: `audit_${Date.now()}`,
      admin_id: adminId!,
      action: 'SUSPEND_USER',
      target_id: userId,
      target_type: 'user',
      details: { reason },
      ip: req.ip,
      user_agent: req.get('user-agent'),
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'User suspended',
      userId
    });

  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
}
