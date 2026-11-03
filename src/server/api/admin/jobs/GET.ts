/**
 * GET /api/admin/jobs
 * Admin only. Every job on the platform, any status, newest first, with
 * the poster and pipeline counts. Read-only.
 */
import type { Request, Response } from 'express';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { db } from '@/server/db/client.js';
import { job, user, candidateApplication, submission, jobAcceptance } from '@/server/db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if ((session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const jobs = await db
      .select({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        status: job.status,
        visibility: job.visibility,
        feeType: job.feeType,
        feePercent: job.feePercent,
        feeAmountRupees: job.feeAmountRupees,
        ctcLabel: job.ctcLabel,
        createdAt: job.createdAt,
        postedByUserId: job.postedByUserId,
        posterName: user.name,
        posterEmail: user.email,
      })
      .from(job)
      .leftJoin(user, eq(job.postedByUserId, user.id))
      .orderBy(desc(job.createdAt))
      .limit(500);

    const ids = jobs.map(j => j.id);
    const countBy = async (table: typeof candidateApplication | typeof submission | typeof jobAcceptance) => {
      if (ids.length === 0) return new Map<string, number>();
      const rows = await db
        .select({ jobId: table.jobId, n: sql<number>`count(*)::int` })
        .from(table)
        .where(inArray(table.jobId, ids))
        .groupBy(table.jobId);
      return new Map(rows.map(r => [r.jobId, Number(r.n)]));
    };
    const [applications, submissions, acceptances] = await Promise.all([
      countBy(candidateApplication),
      countBy(submission),
      countBy(jobAcceptance),
    ]);

    return res.status(200).json({
      jobs: jobs.map(j => ({
        ...j,
        applications: applications.get(j.id) ?? 0,
        submissions: submissions.get(j.id) ?? 0,
        consultantsAccepted: acceptances.get(j.id) ?? 0,
      })),
    });
  } catch (error) {
    console.error('[admin/jobs] error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not load jobs' });
  }
}
