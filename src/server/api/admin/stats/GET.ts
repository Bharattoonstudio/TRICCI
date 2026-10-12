/**
 * GET /api/admin/stats
 * Admin only. Read-only platform counts for the admin dashboard.
 *
 * Revenue and payouts are not calculated here yet, so they return 0.
 * Response: { totalUsers, activeUsers, suspendedUsers, totalJobs, totalApplications, totalPlacements, platformRevenue, pendingPayouts }
 */
import type { Request, Response } from 'express';
import { count, isNotNull } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { db } from '@/server/db/client.js';
import { user, job, candidateApplication, placement } from '@/server/db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if ((session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [users, suspended, removed, jobs, applications, placements] = await Promise.all([
      db.select({ value: count() }).from(user),
      db.select({ value: count() }).from(user).where(isNotNull(user.suspendedAt)),
      db.select({ value: count() }).from(user).where(isNotNull(user.removedAt)),
      db.select({ value: count() }).from(job),
      db.select({ value: count() }).from(candidateApplication),
      db.select({ value: count() }).from(placement),
    ]);

    const totalUsers = Number(users[0]?.value ?? 0);
    const suspendedUsers = Number(suspended[0]?.value ?? 0);
    const removedUsers = Number(removed[0]?.value ?? 0);
    return res.status(200).json({
      totalUsers,
      activeUsers: totalUsers - suspendedUsers - removedUsers,
      suspendedUsers,
      removedUsers,
      totalJobs: Number(jobs[0]?.value ?? 0),
      totalApplications: Number(applications[0]?.value ?? 0),
      totalPlacements: Number(placements[0]?.value ?? 0),
      platformRevenue: 0,
      pendingPayouts: 0,
    });
  } catch (error) {
    console.error('[admin/stats] error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not load stats' });
  }
}
