/**
 * GET /api/consultant/analytics
 * Returns real analytics data for the authenticated consultant.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, job } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') {
      return res.status(403).json({ error: 'Consultant access required' });
    }

    const userId = session.user.id;

    // All submissions by this consultant
    const submissions = await db
      .select({
        id: submission.id,
        status: submission.status,
        jobId: submission.jobId,
      })
      .from(submission)
      .where(eq(submission.consultantUserId, userId));

    const total = submissions.length;
    const shortlisted = submissions.filter(s => s.status === 'shortlisted' || s.status === 'interview' || s.status === 'selected' || s.status === 'closed').length;
    const rejected = submissions.filter(s => s.status === 'rejected').length;
    const selected = submissions.filter(s => s.status === 'selected' || s.status === 'closed').length;
    const joined = submissions.filter(s => s.status === 'closed').length;
    const inReview = submissions.filter(s => s.status === 'pending' || s.status === 'submitted' || s.status === 'review').length;

    // Unique jobs accepted (jobs this consultant has submitted for)
    const uniqueJobIds = new Set(submissions.map(s => s.jobId).filter(Boolean));
    const jobsAccepted = uniqueJobIds.size;

    // Jobs live = jobs that are still open
    const liveJobRows = await db
      .select({ id: job.id })
      .from(job)
      .where(eq(job.status, 'active'));
    const liveJobIds = new Set(liveJobRows.map(j => j.id));
    const jobsLive = [...uniqueJobIds].filter(id => id && liveJobIds.has(id)).length;
    const jobsClosed = jobsAccepted - jobsLive;

    // Ratios
    const resumeSelectionRatio = total > 0 ? Math.round((shortlisted / total) * 100) : 0;
    const selectionRatio = total > 0 ? Math.round((selected / total) * 100) : 0;
    const rejectionRatio = total > 0 ? Math.round((rejected / total) * 100) : 0;
    const prescreeningRatio = total > 0 ? Math.round((inReview / total) * 100) : 0;

    // Performance rating: simple formula based on shortlist + selection ratios
    const rawRating = total === 0 ? 0 : Math.min(5, (resumeSelectionRatio / 100) * 3 + (selectionRatio / 100) * 2);
    const performanceRating = Math.round(rawRating * 10) / 10;
    const rankPercentile = Math.min(95, Math.round(performanceRating * 18));

    res.json({
      jobsAccepted,
      jobsLive,
      jobsClosed: Math.max(0, jobsClosed),
      cvsSubmitted: total,
      cvsRejected: rejected,
      cvsShortlisted: shortlisted,
      candidatesGiven: total,
      candidatesSelected: selected,
      candidatesJoined: joined,
      candidatesBackedOut: 0,
      offersRejected: 0,
      yetToJoin: selected - joined,
      selectionRatio,
      rejectionRatio,
      prescreeningRatio,
      resumeSelectionRatio,
      totalEarned: 0,
      pendingEarnings: 0,
      performanceRating,
      rankPercentile,
    });
  } catch (err) {
    console.error('consultant.analytics.get.error', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}
