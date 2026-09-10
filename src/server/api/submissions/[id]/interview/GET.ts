/**
 * GET /api/submissions/:id/interview
 * Returns the current interview schedule (if any) for a submission —
 * used by both the consultant and employer dashboards to show status.
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

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid submission ID' });

    const [row] = await db
      .select({ consultantUserId: submission.consultantUserId, postedByUserId: job.postedByUserId })
      .from(submission)
      .innerJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ error: 'Submission not found' });
    const isOwner = (role === 'consultant' && row.consultantUserId === session.user.id)
      || (role === 'employer' && row.postedByUserId === session.user.id)
      || role === 'admin';
    if (!isOwner) return res.status(403).json({ error: 'Access denied' });

    const [sched] = await db.select().from(interviewSchedule).where(eq(interviewSchedule.submissionId, id)).limit(1);
    res.json({ interview: sched ?? null });
  } catch (err) {
    console.error('[submissions.interview.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch interview schedule' });
  }
}
