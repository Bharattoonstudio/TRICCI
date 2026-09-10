/**
 * POST /api/employer/submissions/:id/interview/round/create
 * Schedule a new interview round for a candidate
 * Creates entry and sends notification to candidate
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
    if (isNaN(submissionId)) return res.status(400).json({ error: 'Invalid submission ID' });

    const { round, roundName, scheduledAt, interviewerId } = req.body;
    if (!round || !roundName) {
      return res.status(400).json({ error: 'Missing: round number and/or round name' });
    }

    // Get submission to verify ownership (join job for employer ownership + title/company)
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

    // Check if round already exists
    const [existing] = await db.select().from(interviewRound)
      .where(and(eq(interviewRound.submissionId, submissionId), eq(interviewRound.round, round)));
    
    if (existing) {
      return res.status(400).json({ error: `Round ${round} already exists` });
    }

    // Insert new round
    const [newRound] = await db.insert(interviewRound).values({
      submissionId,
      round,
      roundName,
      status: 'scheduled',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      interviewerId: interviewerId || null,
    }).returning();

    // Send email to candidate
    if (scheduledAt) {
      await Promise.allSettled([
        sendEmail({
          to: sub.candidateEmail,
          subject: `Interview Scheduled — ${roundName} Round`,
          html: `
            <p>Hi <strong>${sub.candidateName}</strong>,</p>
            <p>Your <strong>${roundName}</strong> interview for the <strong>${sub.jobTitle}</strong> position is scheduled.</p>
            <p><strong>Date & Time:</strong> ${new Date(scheduledAt).toLocaleString('en-IN')}</p>
            <p><strong>Company:</strong> ${sub.companyName}</p>
            <p>Please confirm your availability. If you have any questions, feel free to reach out.</p>
            <p>Best regards,<br/>${sub.companyName} Team</p>
          `,
          senderName: sub.companyName,
        }).catch(e => {
          console.error('[interview.schedule.email.error]', e);
        }),
      ]);
    }

    // Create notification for consultant
    if (sub.consultantUserId) {
      await db.insert(notification).values({
        userId: sub.consultantUserId,
        type: 'interview_scheduled',
        message: `${roundName} interview scheduled for ${sub.candidateName}`,
        link: `/consultant/dashboard`,
      }).catch(() => {});
    }

    res.json({ ok: true, round: newRound });
  } catch (err) {
    console.error('[employer.submissions.interview.round.create] ERROR:', err);
    res.status(500).json({ error: 'Failed to create interview round' });
  }
}
