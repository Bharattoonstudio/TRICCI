/**
 * POST /api/employer/submissions/:id/interview/round/:roundId/submit-feedback
 * Submit feedback for completed interview
 * Auto-rejects submission if "not a fit"
 * Notifies candidate and consultant
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, interviewRound, notification, job } from '@/server/db/schema.js';
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

    const { feedback, score, reasonForSelection, nextSteps } = req.body;
    if (!feedback || !score || !reasonForSelection) {
      return res.status(400).json({ error: 'Missing: feedback, score, or reasonForSelection' });
    }
    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be 1-5' });
    }

    // Get submission (join job for employer ownership + title/company)
    const [sub] = await db.select({
      id: submission.id,
      candidateName: submission.candidateName,
      candidateEmail: submission.candidateEmail,
      consultantUserId: submission.consultantUserId,
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

    // Update round with feedback
    await db.update(interviewRound)
      .set({
        feedback,
        score,
        reasonForSelection,
        nextSteps: nextSteps || null,
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(interviewRound.id, roundId));

    // If "not a fit", reject the submission
    const isRejected = reasonForSelection === 'not_fit';
    if (isRejected) {
      await db.update(submission)
        .set({ 
          status: 'rejected',
          rejectionReason: feedback,
          updatedAt: new Date(),
        })
        .where(eq(submission.id, submissionId));
    }

    // Send email to candidate
    if (isRejected) {
      await Promise.allSettled([
        sendEmail({
          to: sub.candidateEmail,
          subject: `Interview Update — ${sub.jobTitle}`,
          html: `
            <p>Hi <strong>${sub.candidateName}</strong>,</p>
            <p>Thank you for taking the time to interview for the <strong>${sub.jobTitle}</strong> position at ${sub.companyName}.</p>
            <p>After careful consideration, we have decided to move forward with other candidates at this time.</p>
            <p>We appreciate your interest and wish you all the best in your career.</p>
            <p>Best regards,<br/>${sub.companyName} Team</p>
          `,
          senderName: sub.companyName,
        }).catch(e => {
          console.error('[interview.feedback.rejection.email.error]', e);
        }),
      ]);
    } else {
      // Send positive feedback email
      await Promise.allSettled([
        sendEmail({
          to: sub.candidateEmail,
          subject: `Great News! — ${sub.jobTitle}`,
          html: `
            <p>Hi <strong>${sub.candidateName}</strong>,</p>
            <p>Thank you for completing the <strong>${round.roundName}</strong> round for the <strong>${sub.jobTitle}</strong> position.</p>
            <p>We're impressed with your performance! ${nextSteps ? `Next step: ${nextSteps}` : "We'll be in touch with next steps soon."}</p>
            <p>Best regards,<br/>${sub.companyName} Team</p>
          `,
          senderName: sub.companyName,
        }).catch(e => {
          console.error('[interview.feedback.positive.email.error]', e);
        }),
      ]);
    }

    // Notify consultant
    if (sub.consultantUserId) {
      await db.insert(notification).values({
        userId: sub.consultantUserId,
        type: 'interview_feedback_received',
        message: isRejected
          ? `${round.roundName} feedback: ${sub.candidateName} not selected`
          : `${round.roundName} feedback received for ${sub.candidateName}`,
        link: `/consultant/dashboard`,
      }).catch(() => {});
    }

    res.json({ 
      ok: true,
      round: { ...round, feedback, score, reasonForSelection, status: 'completed' },
      submissionRejected: isRejected,
    });
  } catch (err) {
    console.error('[employer.submissions.interview.feedback] ERROR:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
}
