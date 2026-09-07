/**
 * POST /api/candidate/submissions/:id/interview/acknowledge
 * Candidate confirms they've seen and will attend a proposed/confirmed
 * interview. Ownership verified by matching the submission's candidateEmail
 * to the logged-in candidate's account email (same matching approach used
 * by the read-only view in Phase T, for consistency).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, interviewSchedule } from '@/server/db/schema.js';
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

    const submissionId = parseInt(String(req.params.id), 10);
    if (isNaN(submissionId)) return res.status(400).json({ error: 'Invalid submission ID' });

    const [sub] = await db.select({ candidateEmail: submission.candidateEmail }).from(submission).where(eq(submission.id, submissionId)).limit(1);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (role === 'candidate' && sub.candidateEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Not your submission' });
    }

    const [sched] = await db.select({ id: interviewSchedule.id }).from(interviewSchedule).where(eq(interviewSchedule.submissionId, submissionId)).limit(1);
    if (!sched) return res.status(404).json({ error: 'No interview found for this submission' });

    await db.update(interviewSchedule).set({ candidateAcknowledgedAt: new Date() }).where(eq(interviewSchedule.submissionId, submissionId));

    res.json({ ok: true });
  } catch (err) {
    console.error('[candidate.interview.acknowledge] ERROR:', err);
    res.status(500).json({ error: 'Failed to acknowledge interview' });
  }
}
