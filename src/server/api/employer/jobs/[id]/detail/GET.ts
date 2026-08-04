/**
 * GET /api/employer/jobs/:id/detail
 * Full job detail page data: JD, posted-by team member, and a funnel
 * mini-dashboard (CVs Received / Seen / Shortlisted / Rejected, split by
 * Direct vs Consultant channel).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { job, candidateApplication, submission, user } from '@/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const jobId = String(req.params.id);

    const [jobRow] = await db.select().from(job).where(eq(job.id, jobId)).limit(1);
    if (!jobRow) return res.status(404).json({ error: 'Job not found' });
    if (role === 'employer' && jobRow.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your job posting' });
    }

    const [postedBy] = jobRow.postedByUserId
      ? await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, jobRow.postedByUserId)).limit(1)
      : [];

    const [appCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        seen: sql<number>`count(*) filter (where ${candidateApplication.viewedAt} is not null)::int`,
        shortlisted: sql<number>`count(*) filter (where ${candidateApplication.status} = 'shortlisted')::int`,
        rejected: sql<number>`count(*) filter (where ${candidateApplication.status} = 'rejected')::int`,
      })
      .from(candidateApplication)
      .where(eq(candidateApplication.jobId, jobId));

    const [subCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        seen: sql<number>`count(*) filter (where ${submission.viewedAt} is not null)::int`,
        shortlisted: sql<number>`count(*) filter (where ${submission.status} = 'shortlisted')::int`,
        rejected: sql<number>`count(*) filter (where ${submission.status} = 'rejected')::int`,
      })
      .from(submission)
      .where(eq(submission.jobId, jobId));

    res.json({
      job: jobRow,
      postedBy: postedBy ? { name: postedBy.name, email: postedBy.email } : null,
      funnel: {
        cvsReceived: (appCounts?.total ?? 0) + (subCounts?.total ?? 0),
        seen: (appCounts?.seen ?? 0) + (subCounts?.seen ?? 0),
        shortlisted: (appCounts?.shortlisted ?? 0) + (subCounts?.shortlisted ?? 0),
        rejected: (appCounts?.rejected ?? 0) + (subCounts?.rejected ?? 0),
        direct: appCounts?.total ?? 0,
        consultant: subCounts?.total ?? 0,
      },
    });
  } catch (err) {
    console.error('[employer.jobs.detail] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch job detail' });
  }
}
