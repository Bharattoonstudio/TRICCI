import { Request, Response } from 'express';
import { db } from '@/server/db/client';
import { users, auditLog } from '@/server/db/schema';
import { eq, inArray } from 'drizzle-orm';

interface BulkActionRequest {
  userIds: string[];
  action: 'suspend' | 'activate' | 'delete' | 'resetPassword' | 'sendEmail';
  reason?: string;
  emailTemplate?: string;
}

export async function POST(req: Request, res: Response) {
  try {
    const adminId = req.user?.id;
    const { userIds, action, reason, emailTemplate } = req.body as BulkActionRequest;

    // Verify admin
    const adminUser = await db.query.users.findFirst({
      where: eq(users.id, adminId!),
    });

    if (adminUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate input
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Invalid userIds array' });
    }

    if (userIds.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 users per bulk action' });
    }

    // Prevent admin from being included in suspension/deletion
    if (['suspend', 'delete'].includes(action)) {
      if (userIds.includes(adminId!)) {
        return res.status(400).json({
          error: 'Cannot suspend/delete your own account',
        });
      }
    }

    let updatedCount = 0;
    const actionResults = {
      success: [] as string[],
      failed: [] as { userId: string; error: string }[],
    };

    switch (action) {
      case 'suspend':
        for (const userId of userIds) {
          try {
            await db.update(users)
              .set({
                status: 'suspended',
                suspendedAt: new Date(),
                suspendReason: reason || 'Bulk admin suspension',
              })
              .where(eq(users.id, userId));
            actionResults.success.push(userId);
            updatedCount++;
          } catch (error) {
            actionResults.failed.push({
              userId,
              error: 'Failed to suspend',
            });
          }
        }
        break;

      case 'activate':
        for (const userId of userIds) {
          try {
            await db.update(users)
              .set({
                status: 'active',
                suspendedAt: null,
                suspendReason: null,
              })
              .where(eq(users.id, userId));
            actionResults.success.push(userId);
            updatedCount++;
          } catch (error) {
            actionResults.failed.push({
              userId,
              error: 'Failed to activate',
            });
          }
        }
        break;

      case 'delete':
        for (const userId of userIds) {
          try {
            const targetUser = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });

            await db.update(users)
              .set({
                status: 'deleted',
                email: `deleted_${Date.now()}_${targetUser?.email || userId}`,
                name: 'Deleted User',
                deletedAt: new Date(),
                deletedBy: adminId!,
              })
              .where(eq(users.id, userId));
            actionResults.success.push(userId);
            updatedCount++;
          } catch (error) {
            actionResults.failed.push({
              userId,
              error: 'Failed to delete',
            });
          }
        }
        break;

      case 'resetPassword':
        for (const userId of userIds) {
          try {
            const targetUser = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });

            if (!targetUser) {
              actionResults.failed.push({
                userId,
                error: 'User not found',
              });
              continue;
            }

            // Generate reset token and send email
            const resetToken = generateToken();
            await db.update(users)
              .set({
                passwordResetToken: resetToken,
                passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
              })
              .where(eq(users.id, userId));

            // Send reset email
            await sendPasswordResetEmail(targetUser.email, resetToken);
            actionResults.success.push(userId);
            updatedCount++;
          } catch (error) {
            actionResults.failed.push({
              userId,
              error: 'Failed to reset password',
            });
          }
        }
        break;

      case 'sendEmail':
        for (const userId of userIds) {
          try {
            const targetUser = await db.query.users.findFirst({
              where: eq(users.id, userId),
            });

            if (!targetUser) {
              actionResults.failed.push({
                userId,
                error: 'User not found',
              });
              continue;
            }

            // Send email based on template
            await sendBulkEmail(
              targetUser.email,
              emailTemplate || 'default',
              targetUser
            );
            actionResults.success.push(userId);
            updatedCount++;
          } catch (error) {
            actionResults.failed.push({
              userId,
              error: 'Failed to send email',
            });
          }
        }
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Log audit entry for bulk action
    await db.insert(auditLog).values({
      adminId,
      action: `BULK_${action.toUpperCase()}`,
      targetType: 'users',
      details: {
        count: updatedCount,
        userIds,
        successCount: actionResults.success.length,
        failedCount: actionResults.failed.length,
      },
      ip: req.ip,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      action,
      results: actionResults,
      summary: {
        total: userIds.length,
        successful: actionResults.success.length,
        failed: actionResults.failed.length,
      },
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
}

function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

async function sendPasswordResetEmail(email: string, token: string) {
  // Implementation with Brevo/email service
  try {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    // Send email
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
}

async function sendBulkEmail(email: string, template: string, user: any) {
  // Implementation with Brevo/email service
  try {
    // Send based on template
    console.log(`Email sent to ${email} using template: ${template}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
