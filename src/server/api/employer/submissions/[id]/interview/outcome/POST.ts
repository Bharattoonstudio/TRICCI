/**
 * POST /api/employer/submissions/:id/interview/outcome
 * Points 44-47: records the interview outcome (Selected/Rejected/Hold) on
 * the interview_schedule row, closing out the interview stage. This does
 * NOT send emails itself — the frontend also calls the existing
 * PUT /api/submissions/:id/status endpoint with the same outcome, which
 * already has the full candidate/consultant/employer email logic
 * (points 45-46) and placement-recording logic. This endpoint just keeps
 * interview_schedule in sync so the pipeline trail (point 47) is accurate.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, interviewSchedule, job } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid submission ID' });

    const { outcome, reason } = req.body as { outcome?: 'selected' | 'rejected' | 'hold'; reason?: string };
    if (!outcome || !['selected', 'rejected', 'hold'].includes(outcome)) {
      return res.status(400).json({ error: 'outcome must be one of: selected, rejected, hold' });
    }
    if (outcome === 'rejected' && !reason?.trim()) {
      return res.status(400).json({ error: 'A reason is required when marking a candidate as rejected' });
    }

    const [row] = await db
      .select({ postedByUserId: job.postedByUserId })
      .from(submission)
      .innerJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.id, id))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'Submission not found' });
    if (role === 'employer' && row.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your job posting' });
    }

    const [sched] = await db.select({ id: interviewSchedule.id }).from(interviewSchedule).where(eq(interviewSchedule.submissionId, id)).limit(1);
    if (!sched) return res.status(404).json({ error: 'No interview record found for this submission' });

    await db.update(interviewSchedule).set({
      status: 'completed',
      outcome,
      outcomeReason: outcome === 'rejected' ? reason!.trim() : null,
      outcomeSetAt: new Date(),
    }).where(eq(interviewSchedule.submissionId, id));

    res.json({ ok: true });
  } catch (err) {
    console.error('[employer.interview.outcome] ERROR:', err);
    res.status(500).json({ error: 'Failed to record interview outcome' });
  }
}
