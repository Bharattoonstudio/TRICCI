/**
 * POST /api/consultant/submissions/:id/interview/propose
 * Points 40, 43: consultant proposes an interview date/time for a
 * shortlisted submission. Also used to propose an ALTERNATE date if the
 * candidate was unavailable for a previously employer-requested-alternate slot.
 * Body: { proposedDate: ISO string, note?: string }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, interviewSchedule, job, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid submission ID' });

    const { proposedDate, note } = req.body as { proposedDate?: string; note?: string };
    if (!proposedDate || isNaN(new Date(proposedDate).getTime())) {
      return res.status(400).json({ error: 'A valid proposedDate is required' });
    }
    if (new Date(proposedDate).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Proposed date must be in the future' });
    }

    const [row] = await db
      .select({
        submissionId: submission.id,
        status: submission.status,
        consultantUserId: submission.consultantUserId,
        jobTitle: job.title,
        company: job.company,
        postedByUserId: job.postedByUserId,
      })
      .from(submission)
      .innerJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ error: 'Submission not found' });
    if (role === 'consultant' && row.consultantUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your submission' });
    }
    if (!['shortlisted', 'interview'].includes(row.status)) {
      return res.status(400).json({ error: `Cannot propose an interview while status is "${row.status}"` });
    }

    const [existing] = await db.select({ id: interviewSchedule.id }).from(interviewSchedule).where(eq(interviewSchedule.submissionId, id)).limit(1);

    if (existing) {
      await db.update(interviewSchedule).set({
        status: 'proposed',
        proposedDate: new Date(proposedDate),
        proposedByRole: 'consultant',
        proposalNote: note?.trim() || null,
        interviewerName: null,
        interviewerDesignation: null,
        interviewerContact: null,
        confirmedAt: null,
      }).where(eq(interviewSchedule.submissionId, id));
    } else {
      await db.insert(interviewSchedule).values({
        submissionId: id,
        status: 'proposed',
        proposedDate: new Date(proposedDate),
        proposedByRole: 'consultant',
        proposalNote: note?.trim() || null,
      });
    }

    // Notify employer that a date has been proposed
    if (row.postedByUserId) {
      const [employer] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.postedByUserId)).limit(1);
      if (employer?.email) {
        sendEmail({
          to: employer.email,
          subject: `Interview date proposed — ${row.jobTitle}`,
          html: `<p>Hi ${employer.name?.split(' ')[0] || ''},</p><p>A consultant has proposed <strong>${new Date(proposedDate).toLocaleString('en-IN')}</strong> for an interview slot for <strong>${row.jobTitle}</strong> at ${row.company}. Log in to your ATS dashboard to confirm or request an alternate time.</p>`,
        }).catch(e => console.error('interview.propose.email.error', e));
      }
    }

    res.json({ ok: true, status: 'proposed' });
  } catch (err) {
    console.error('[consultant.interview.propose] ERROR:', err);
    res.status(500).json({ error: 'Failed to propose interview date' });
  }
}
