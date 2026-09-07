/**
 * GET /api/submissions/:id
 * Fetch submission details.
 * 
 * P0 #5: Authorization checks ensure user owns this submission or their job
 * 
 * Access:
 * - Employer: can view submissions for their posted jobs
 * - Consultant: can view their own submissions
 * - Candidate: can view their own submissions
 * - Admin: can view any submission
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, job, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });

    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const userId = session.user.id;
    const role = (session.user as { role?: string } | null)?.role;
    const isAdmin = (session.user as { isAdmin?: boolean } | null)?.isAdmin ?? false;

    const submissionId = parseInt(String(req.params.id), 10);
    if (isNaN(submissionId)) return res.status(400).json({ error: 'Invalid submission ID' });

    // P0 #5: Fetch submission with authorization context
    const [sub] = await db
      .select({
        id: submission.id,
        jobId: submission.jobId,
        status: submission.status,
        candidateName: submission.candidateName,
        candidateEmail: submission.candidateEmail,
        consultantUserId: submission.consultantUserId,
        candidateUserId: submission.candidateUserId,
        jobTitle: job.title,
        company: job.company,
        postedByUserId: job.postedByUserId,
        candidatePhone: submission.candidatePhone,
        candidateLocation: submission.candidateLocation,
        ctcFixed: submission.ctcFixed,
        ctcVariable: submission.ctcVariable,
        ctcEsops: submission.ctcEsops,
        experience: submission.experience,
        noticePeriodDays: submission.noticePeriodDays,
        duplicateFlag: submission.duplicateFlag,
        winningConsultantId: submission.winningConsultantId,
      })
      .from(submission)
      .leftJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.id, submissionId))
      .limit(1);

    if (!sub) return res.status(404).json({ error: 'Submission not found' });

    // P0 #5: Authorization checks
    if (!isAdmin) {
      const isEmployer = sub.postedByUserId === userId;
      const isConsultant = sub.consultantUserId === userId;
      const isCandidate = sub.candidateUserId === userId;

      if (!isEmployer && !isConsultant && !isCandidate) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this submission',
        });
      }

      // Consultants can only view if submission is duplicate (no business access)
      if (isConsultant && sub.duplicateFlag === 'duplicate') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only view active submissions (not duplicates)',
        });
      }
    }

    res.json({
      ok: true,
      submission: {
        id: sub.id,
        jobId: sub.jobId,
        status: sub.status,
        candidateName: sub.candidateName,
        candidateEmail: sub.candidateEmail,
        candidatePhone: sub.candidatePhone,
        candidateLocation: sub.candidateLocation,
        consultantUserId: sub.consultantUserId,
        candidateUserId: sub.candidateUserId,
        jobTitle: sub.jobTitle,
        company: sub.company,
        ctcFixed: sub.ctcFixed,
        ctcVariable: sub.ctcVariable,
        ctcEsops: sub.ctcEsops,
        experience: sub.experience,
        noticePeriodDays: sub.noticePeriodDays,
        duplicateFlag: sub.duplicateFlag,
        // Only show winning_consultant_id to admin and affected parties
        winningConsultantId: isAdmin || sub.winningConsultantId === userId ? sub.winningConsultantId : null,
      },
    });
  } catch (err) {
    console.error('[submissions.GET] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
}
