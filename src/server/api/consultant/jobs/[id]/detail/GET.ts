/**
 * GET /api/consultant/jobs/:id/detail
 * Mirrors the employer's job detail page, from the consultant's side:
 * the job info, plus a funnel of ONLY this consultant's own submissions
 * for this job (Submitted / Seen / Shortlisted / Rejected / Interview /
 * Selected), with rejection reasons visible where present.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { job, submission } from '@/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const jobId = String(req.params.id);

    const [jobRow] = await db.select().from(job).where(eq(job.id, jobId)).limit(1);
    if (!jobRow) return res.status(404).json({ error: 'Job not found' });

    const mySubmissions = await db
      .select()
      .from(submission)
      .where(role === 'consultant'
        ? and(eq(submission.jobId, jobId), eq(submission.consultantUserId, session.user.id))
        : eq(submission.jobId, jobId))
      .orderBy(submission.createdAt);

    const [counts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        seen: sql<number>`count(*) filter (where ${submission.viewedAt} is not null)::int`,
        shortlisted: sql<number>`count(*) filter (where ${submission.status} = 'shortlisted')::int`,
        rejected: sql<number>`count(*) filter (where ${submission.status} = 'rejected')::int`,
        interview: sql<number>`count(*) filter (where ${submission.status} = 'interview')::int`,
        selected: sql<number>`count(*) filter (where ${submission.status} in ('selected','placed'))::int`,
      })
      .from(submission)
      .where(role === 'consultant'
        ? and(eq(submission.jobId, jobId), eq(submission.consultantUserId, session.user.id))
        : eq(submission.jobId, jobId));

    res.json({
      job: jobRow,
      submissions: mySubmissions,
      funnel: {
        submitted: counts?.total ?? 0,
        seen: counts?.seen ?? 0,
        shortlisted: counts?.shortlisted ?? 0,
        interview: counts?.interview ?? 0,
        rejected: counts?.rejected ?? 0,
        selected: counts?.selected ?? 0,
      },
    });
  } catch (err) {
    console.error('[consultant.jobs.detail] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch job detail' });
  }
}
