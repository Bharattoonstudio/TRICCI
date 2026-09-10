import { Request, Response } from 'express';
import { db } from '@/server/db/client';
import {
  user,
  job,
  submission,
  placement,
  walletTransaction,
} from '@/server/db/schema';
import { eq, and, gte } from 'drizzle-orm';

export default async function GET(req: Request, res: Response) {
  try {
    // Verify admin
    const adminId = req.user?.id;
    const adminUser = await db.query.user.findFirst({
      where: eq(user.id, adminId!),
    });

    if (adminUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { period = '30' } = req.query;
    const days = parseInt(period as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all stats in parallel
    const [
      totalUsersResult,
      activeUsersResult,
      suspendedUsersResult,
      totalJobsResult,
      totalApplicationsResult,
      totalPlacementsResult,
      revenueResult,
      usersByRoleResult,
      recentUsersResult,
      topConsultantsResult,
      conversionMetricsResult,
    ] = await Promise.all([
      // Total users
      db.select({ count: 'count' }).from(user),

      // Active users
      db
        .select({ count: 'count' })
        .from(user)
        .where(eq(user.status, 'active')),

      // Suspended users
      db
        .select({ count: 'count' })
        .from(user)
        .where(eq(user.status, 'suspended')),

      // Total job
      db.select({ count: 'count' }).from(job),

      // Total applications
      db.select({ count: 'count' }).from(submission),

      // Total placement
      db
        .select({ count: 'count' })
        .from(placement)
        .where(eq(placement.status, 'placed')),

      // Revenue calculation
      db
        .select({
          totalRevenue: 'sum(amount)',
          pendingPayouts: 'sum(pending_amount)',
        })
        .from(walletTransaction)
        .where(gte(walletTransaction.createdAt, startDate)),

      // Users by role
      db
        .select({ role: users.role, count: 'count' })
        .from(user)
        .groupBy(users.role),

      // Recent users (last 7 days)
      db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(user)
        .where(gte(users.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
        .limit(10),

      // Top consultants by placement
      db
        .select({
          consultantId: placement.consultantId,
          placement: 'count',
          totalEarnings: 'sum(fee)',
        })
        .from(placement)
        .groupBy(placement.consultantId)
        .limit(5),

      // Conversion metrics
      db
        .select({
          totalApplications: 'count(id)',
          placedApplications: 'count(case when status = "placed" then 1 end)',
          rejectedApplications:
            'count(case when status = "rejected" then 1 end)',
        })
        .from(submission),
    ]);

    // Calculate metrics
    const totalUsers = totalUsersResult[0]?.count || 0;
    const activeUsers = activeUsersResult[0]?.count || 0;
    const suspendedUsers = suspendedUsersResult[0]?.count || 0;
    const totalJobs = totalJobsResult[0]?.count || 0;
    const totalApplications = totalApplicationsResult[0]?.count || 0;
    const totalPlacements = totalPlacementsResult[0]?.count || 0;
    const platformRevenue = revenueResult[0]?.totalRevenue || 0;
    const pendingPayouts = revenueResult[0]?.pendingPayouts || 0;

    // Conversion rate
    const conversionMetrics = conversionMetricsResult[0] || {};
    const conversionRate = totalApplications
      ? ((conversionMetrics.placedApplications || 0) / totalApplications) * 100
      : 0;

    // User growth (compare with previous period)
    const previousPeriodDate = new Date();
    previousPeriodDate.setDate(previousPeriodDate.getDate() - days * 2);
    const previousUsersResult = await db
      .select({ count: 'count' })
      .from(user)
      .where(
        and(
          gte(users.createdAt, previousPeriodDate),
          gte(new Date(), users.createdAt!)
        )
      );

    const previousUsers = previousUsersResult[0]?.count || 0;
    const newUsersThisPeriod = totalUsers - previousUsers;
    const userGrowthRate =
      previousUsers > 0 ? ((newUsersThisPeriod / previousUsers) * 100).toFixed(2) : 0;

    // Job stats
    const activeJobsResult = await db
      .select({ count: 'count' })
      .from(job)
      .where(eq(job.status, 'active'));
    const activeJobs = activeJobsResult[0]?.count || 0;

    // Average metrics
    const avgApplicationsPerJob =
      totalJobs > 0 ? (totalApplications / totalJobs).toFixed(2) : 0;
    const avgTimeToPlacement = '5.2 days'; // This would need historical data

    return res.json({
      success: true,
      stats: {
        overview: {
          totalUsers,
          activeUsers,
          suspendedUsers,
          totalJobs,
          activeJobs,
          totalApplications,
          totalPlacements,
          platformRevenue,
          pendingPayouts,
        },
        metrics: {
          conversionRate: conversionRate.toFixed(2),
          userGrowthRate,
          avgApplicationsPerJob,
          avgTimeToPlacement,
          activeUserPercentage: ((activeUsers / totalUsers) * 100).toFixed(2),
        },
        breakdown: {
          usersByRole: usersByRoleResult.map((r) => ({
            role: r.role,
            count: r.count,
          })),
          jobStatus: {
            active: activeJobs,
            completed: totalJobs - activeJobs,
            draft: 0,
          },
        },
        recent: {
          newUsers: recentUsersResult,
          topConsultants: topConsultantsResult,
        },
        timestamp: new Date(),
        period: {
          days,
          startDate,
          endDate: new Date(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}
