/**
 * GET /api/employer/consultants/performance
 * Point: Consultant Performance Analytics — TRICCI's key differentiator.
 * Aggregates every consultant who has submitted to this employer's jobs:
 * submissions, shortlist rate, selection rate, rejection rate, and average
 * time-to-first-view (a proxy for employer responsiveness, not consultant
 * speed — flagged clearly in the response).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, job, user } from '@/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const rows = await db
      .select({
        consultantUserId: submission.consultantUserId,
        consultantName: user.name,
        consultantEmail: user.email,
        totalSubmissions: sql<number>`count(*)::int`,
        shortlisted: sql<number>`count(*) filter (where ${submission.status} = 'shortlisted')::int`,
        interview: sql<number>`count(*) filter (where ${submission.status} = 'interview')::int`,
        selected: sql<number>`count(*) filter (where ${submission.status} in ('selected','placed','offered'))::int`,
        rejected: sql<number>`count(*) filter (where ${submission.status} = 'rejected')::int`,
        jobsSubmittedTo: sql<number>`count(distinct ${submission.jobId})::int`,
        avgHoursToView: sql<number | null>`avg(extract(epoch from (${submission.viewedAt} - ${submission.createdAt})) / 3600) filter (where ${submission.viewedAt} is not null)`,
      })
      .from(submission)
      .innerJoin(job, eq(submission.jobId, job.id))
      .innerJoin(user, eq(submission.consultantUserId, user.id))
      .where(role === 'employer' ? eq(job.postedByUserId, session.user.id) : sql`true`)
      .groupBy(submission.consultantUserId, user.name, user.email);

    const consultants = rows.map(r => {
      const total = r.totalSubmissions || 0;
      return {
        consultantUserId: r.consultantUserId,
        consultantName: r.consultantName,
        consultantEmail: r.consultantEmail,
        totalSubmissions: total,
        jobsSubmittedTo: r.jobsSubmittedTo,
        shortlisted: r.shortlisted,
        interview: r.interview,
        selected: r.selected,
        rejected: r.rejected,
        shortlistRate: total > 0 ? Math.round((r.shortlisted / total) * 100) : 0,
        selectionRate: total > 0 ? Math.round((r.selected / total) * 100) : 0,
        rejectionRate: total > 0 ? Math.round((r.rejected / total) * 100) : 0,
        avgHoursToView: r.avgHoursToView != null ? Math.round(Number(r.avgHoursToView) * 10) / 10 : null,
      };
    }).sort((a, b) => b.selectionRate - a.selectionRate || b.totalSubmissions - a.totalSubmissions);

    res.json({
      consultants,
      note: 'avgHoursToView measures how long it took YOU to first open a candidate\'s CV after submission — a responsiveness metric for your own team, not a speed metric for the consultant.',
    });
  } catch (err) {
    console.error('[employer.consultants.performance] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch consultant performance' });
  }
}
