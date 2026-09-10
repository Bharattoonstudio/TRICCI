/**
 * GET /api/candidate/consultant-submissions
 * A candidate may be submitted to jobs by a consultant without ever
 * applying directly — this endpoint matches by email so the candidate can
 * see those submissions and, critically, any interview details scheduled
 * for them (previously invisible to the candidate entirely — only the
 * employer and consultant could see proposed/confirmed interview times).
 * View-only: no candidate-side accept/reschedule action yet.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, job, interviewSchedule, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'candidate' && role !== 'admin') return res.status(403).json({ error: 'Candidate access required' });

    const email = session.user.email.toLowerCase();

    const rows = await db
      .select({
        submissionId: submission.id,
        status: submission.status,
        jobTitle: job.title,
        company: job.company,
        consultantName: user.name,
        createdAt: submission.createdAt,
        rejectionReason: submission.rejectionReason,
      })
      .from(submission)
      .innerJoin(job, eq(submission.jobId, job.id))
      .leftJoin(user, eq(submission.consultantUserId, user.id))
      .where(eq(submission.candidateEmail, email));

    // Attach interview details where present
    const results = await Promise.all(rows.map(async (r) => {
      const [sched] = await db
        .select({
          status: interviewSchedule.status,
          proposedDate: interviewSchedule.proposedDate,
          interviewerName: interviewSchedule.interviewerName,
          interviewerDesignation: interviewSchedule.interviewerDesignation,
          confirmedAt: interviewSchedule.confirmedAt,
          candidateAcknowledgedAt: interviewSchedule.candidateAcknowledgedAt,
        })
        .from(interviewSchedule)
        .where(eq(interviewSchedule.submissionId, r.submissionId))
        .limit(1);
      return { ...r, interview: sched ?? null };
    }));

    res.json({ submissions: results });
  } catch (err) {
    console.error('[candidate.consultant-submissions] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}
