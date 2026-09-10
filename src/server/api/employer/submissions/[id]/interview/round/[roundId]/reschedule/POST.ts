/**
 * POST /api/employer/submissions/:id/interview/round/:roundId/reschedule
 * Change the scheduled date/time of an interview
 * Notifies candidate of new schedule
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, interviewRound, job } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const role = (session?.user as { role?: string } | null)?.role;
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const submissionId = parseInt(String(req.params.id), 10);
    const roundId = parseInt(String(req.params.roundId), 10);
    if (isNaN(submissionId) || isNaN(roundId)) {
      return res.status(400).json({ error: 'Invalid submission or round ID' });
    }

    const { scheduledAt } = req.body;
    if (!scheduledAt) {
      return res.status(400).json({ error: 'Missing: scheduledAt' });
    }

    // Get submission to verify ownership (join job for employer ownership + title/company)
    const [sub] = await db.select({
      id: submission.id,
      candidateName: submission.candidateName,
      candidateEmail: submission.candidateEmail,
      jobTitle: job.title,
      companyName: job.company,
      postedByUserId: job.postedByUserId,
    }).from(submission)
      .leftJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.id, submissionId)).limit(1);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (role === 'employer' && sub.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your submission' });
    }

    // Get and update round
    const [round] = await db.select().from(interviewRound)
      .where(and(
        eq(interviewRound.id, roundId),
        eq(interviewRound.submissionId, submissionId)
      ))
      .limit(1);

    if (!round) return res.status(404).json({ error: 'Interview round not found' });

    const newScheduledAt = new Date(scheduledAt);
    await db.update(interviewRound)
      .set({ scheduledAt: newScheduledAt, updatedAt: new Date() })
      .where(eq(interviewRound.id, roundId));

    // Send notification email to candidate
    await Promise.allSettled([
      sendEmail({
        to: sub.candidateEmail,
        subject: `Interview Rescheduled — ${round.roundName} Round`,
        html: `
          <p>Hi <strong>${sub.candidateName}</strong>,</p>
          <p>Your <strong>${round.roundName}</strong> interview for <strong>${sub.jobTitle}</strong> has been rescheduled.</p>
          <p><strong>New Date & Time:</strong> ${newScheduledAt.toLocaleString('en-IN')}</p>
          <p>We apologize for any inconvenience this may have caused. Please confirm your availability at the new time.</p>
          <p>Best regards,<br/>${sub.companyName} Team</p>
        `,
        senderName: sub.companyName,
      }).catch(e => {
        console.error('[interview.reschedule.email.error]', e);
      }),
    ]);

    res.json({ ok: true, round: { ...round, scheduledAt: newScheduledAt } });
  } catch (err) {
    console.error('[employer.submissions.interview.round.reschedule] ERROR:', err);
    res.status(500).json({ error: 'Failed to reschedule interview round' });
  }
}
