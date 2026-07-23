import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { pool } from '@/server/db/pool.js';
import { user, job, jobAlertSubscription } from '@/server/db/schema.js';
import { eq, count, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session || role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [totalUsers] = await db.select({ count: count() }).from(user);
    const [employers] = await db.select({ count: count() }).from(user).where(eq(user.role, 'employer'));
    const [consultants] = await db.select({ count: count() }).from(user).where(eq(user.role, 'consultant'));
    const [candidates] = await db.select({ count: count() }).from(user).where(eq(user.role, 'candidate'));
    const [activeJobs] = await db.select({ count: count() }).from(job).where(eq(job.status, 'active'));
    const [alertSubs] = await db.select({ count: count() }).from(jobAlertSubscription).where(and(eq(jobAlertSubscription.active, true)));

    // Real placement stats from placement table
    let totalPlacements = 0;
    let totalRevenue = 0;
    try {
      const [[placementStats]] = await pool.query<any[]>(
        `SELECT COUNT(*) AS cnt, COALESCE(SUM(fee_amount_lpa), 0) AS rev FROM placement`
      );
      totalPlacements = Number(placementStats?.cnt ?? 0);
      totalRevenue = Number(placementStats?.rev ?? 0);
    } catch {
      // placement table may not exist yet on first boot — migration runs async
    }

    res.json({
      totalUsers: totalUsers.count,
      employers: employers.count,
      consultants: consultants.count,
      candidates: candidates.count,
      activeJobs: activeJobs.count,
      alertSubscriptions: alertSubs.count,
      totalPlacements,
      totalRevenue,
      pendingApprovals: 0,
      mrr: 0,
    });
  } catch (err) {
    console.error('admin.stats.error', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
