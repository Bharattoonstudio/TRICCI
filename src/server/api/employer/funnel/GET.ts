/**
 * GET /api/employer/funnel
 * Point 13: full funnel rollup — CVs Received → Seen → Rejected →
 * Shortlisted → Interview → Selected — all counts visible together,
 * scoped to the logged-in employer's own job postings.
 *
 * NOTE on "Interview": there is no interview-scheduling system built yet
 * (that's a separate, larger piece of work — SOP points 39-47). This count
 * is honestly reported as 0 rather than approximated from some other
 * status, since misrepresenting it would be worse than an accurate zero.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateApplication, submission, job } from '@/server/db/schema.js';
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

    const employerId = session.user.id;

    const [appCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        seen: sql<number>`count(*) filter (where ${candidateApplication.viewedAt} is not null)::int`,
        rejected: sql<number>`count(*) filter (where ${candidateApplication.status} = 'rejected')::int`,
        shortlisted: sql<number>`count(*) filter (where ${candidateApplication.status} = 'shortlisted')::int`,
        selected: sql<number>`count(*) filter (where ${candidateApplication.status} = 'placed')::int`,
      })
      .from(candidateApplication)
      .innerJoin(job, eq(candidateApplication.jobId, job.id))
      .where(role === 'employer' ? eq(job.postedByUserId, employerId) : sql`true`);

    const [subCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        seen: sql<number>`count(*) filter (where ${submission.viewedAt} is not null)::int`,
        rejected: sql<number>`count(*) filter (where ${submission.status} = 'rejected')::int`,
        shortlisted: sql<number>`count(*) filter (where ${submission.status} = 'shortlisted')::int`,
        selected: sql<number>`count(*) filter (where ${submission.status} = 'placed')::int`,
      })
      .from(submission)
      .innerJoin(job, eq(submission.jobId, job.id))
      .where(role === 'employer' ? eq(job.postedByUserId, employerId) : sql`true`);

    res.json({
      cvsReceived: (appCounts?.total ?? 0) + (subCounts?.total ?? 0),
      seen: (appCounts?.seen ?? 0) + (subCounts?.seen ?? 0),
      rejected: (appCounts?.rejected ?? 0) + (subCounts?.rejected ?? 0),
      shortlisted: (appCounts?.shortlisted ?? 0) + (subCounts?.shortlisted ?? 0),
      interview: 0, // interview scheduling not yet built — honestly reported as 0, not estimated
      selected: (appCounts?.selected ?? 0) + (subCounts?.selected ?? 0),
    });
  } catch (err) {
    console.error('[employer.funnel] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch funnel data' });
  }
}
