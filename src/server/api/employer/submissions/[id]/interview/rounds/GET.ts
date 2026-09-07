/**
 * GET /api/employer/submissions/:id/interview/rounds
 * Retrieve all interview rounds for a candidate submission
 * Shows timeline of interviews, feedback, scores
 * Accessible by employer who owns the submission
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, interviewRound } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const role = (session?.user as { role?: string } | null)?.role;
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const submissionId = parseInt(String(req.params.id), 10);
    if (isNaN(submissionId)) return res.status(400).json({ error: 'Invalid submission ID' });

    // Get submission to verify ownership
    const [sub] = await db.select().from(submission).where(eq(submission.id, submissionId)).limit(1);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (role === 'employer' && sub.employerUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your submission' });
    }

    // Get all interview rounds
    const rounds = await db.select().from(interviewRound)
      .where(eq(interviewRound.submissionId, submissionId))
      .orderBy(interviewRound.round);

    res.json({ 
      rounds,
      candidateName: sub.candidateName,
      jobTitle: sub.jobTitle,
    });
  } catch (err) {
    console.error('[employer.submissions.interview.rounds.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch interview rounds' });
  }
}
