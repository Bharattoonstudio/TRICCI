/**
 * GET /api/candidate/interviews
 * Retrieve all interviews for logged-in candidate
 * Shows scheduled, in-progress, completed, and cancelled rounds
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, interviewRound, job } from '@/server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    // Get all submissions for this candidate (by email matching)
    const candidateSubmissions = await db.select({
      submissionId: submission.id,
      candidateName: submission.candidateName,
      jobTitle: job.title,
      companyName: job.company,
    }).from(submission)
      .leftJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.candidateEmail, session.user.email || ''));

    if (candidateSubmissions.length === 0) {
      return res.json({ interviews: [] });
    }

    const submissionIds = candidateSubmissions.map(s => s.submissionId);

    // Get all interview rounds for these submissions
    const interviews = await db.select().from(interviewRound)
      .where(inArray(interviewRound.submissionId, submissionIds))
      .orderBy(interviewRound.scheduledAt);

    // Combine with submission details
    const enriched = interviews.map(ir => {
      const sub = candidateSubmissions.find(s => s.submissionId === ir.submissionId)!;
      return {
        ...ir,
        candidateName: sub.candidateName,
        jobTitle: sub.jobTitle,
        companyName: sub.companyName,
      };
    });

    res.json({ interviews: enriched });
  } catch (err) {
    console.error('[candidate.interviews.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch interviews' });
  }
}
