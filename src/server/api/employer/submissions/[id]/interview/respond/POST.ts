/**
 * POST /api/employer/submissions/:id/interview/respond
 * Points 41-43: employer either CONFIRMS the proposed date (providing
 * interviewer details, triggers 3-way email — point 42) or REQUESTS AN
 * ALTERNATE (candidate unavailable — consultant will re-propose via the
 * propose endpoint, point 43).
 * Body: { action: 'confirm', interviewerName, interviewerDesignation, interviewerContact }
 *     | { action: 'request_alternate', note?: string }
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
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid submission ID' });

    const { action, interviewerName, interviewerDesignation, interviewerContact, note } = req.body as {
      action?: 'confirm' | 'request_alternate';
      interviewerName?: string;
      interviewerDesignation?: string;
      interviewerContact?: string;
      note?: string;
    };
    if (action !== 'confirm' && action !== 'request_alternate') {
      return res.status(400).json({ error: 'action must be "confirm" or "request_alternate"' });
    }
    if (action === 'confirm' && !interviewerName?.trim()) {
      return res.status(400).json({ error: 'Interviewer name is required to confirm' });
    }

    const [row] = await db
      .select({
        submissionId: submission.id,
        candidateName: submission.candidateName,
        candidateEmail: submission.candidateEmail,
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
    if (role === 'employer' && row.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your job posting' });
    }

    const [sched] = await db.select().from(interviewSchedule).where(eq(interviewSchedule.submissionId, id)).limit(1);
    if (!sched) return res.status(404).json({ error: 'No interview proposal found for this submission' });
    if (sched.status !== 'proposed') {
      return res.status(400).json({ error: `Cannot respond — current status is "${sched.status}"` });
    }

    if (action === 'request_alternate') {
      await db.update(interviewSchedule).set({ status: 'alternate_requested', proposalNote: note?.trim() || null }).where(eq(interviewSchedule.submissionId, id));

      const [consultant] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.consultantUserId)).limit(1);
      if (consultant?.email) {
        sendEmail({
          to: consultant.email,
          subject: `Alternate interview time requested — ${row.candidateName}`,
          html: `<p>Hi ${consultant.name?.split(' ')[0] || ''},</p><p>The employer has requested an alternate interview time for <strong>${row.candidateName}</strong> (${row.jobTitle}).${note ? ` Note: ${note}` : ''}</p><p>Please propose a new date/time from your dashboard.</p>`,
        }).catch(e => console.error('interview.alt.email.error', e));
      }

      return res.json({ ok: true, status: 'alternate_requested' });
    }

    // action === 'confirm'
    const confirmedAt = new Date();
    await db.update(interviewSchedule).set({
      status: 'confirmed',
      interviewerName: interviewerName!.trim(),
      interviewerDesignation: interviewerDesignation?.trim() || null,
      interviewerContact: interviewerContact?.trim() || null,
      confirmedAt,
    }).where(eq(interviewSchedule.submissionId, id));

    // Move the submission itself to 'interview' status
    await db.update(submission).set({ status: 'interview', updatedAt: new Date() }).where(eq(submission.id, id));

    // Point 42: auto-email to employer + consultant + candidate on confirmation
    const dateStr = sched.proposedDate.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
    const [consultant, employer] = await Promise.all([
      db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.consultantUserId)).limit(1),
      row.postedByUserId ? db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.postedByUserId)).limit(1) : Promise.resolve([]),
    ]);

    const recipients: { to: string; name: string }[] = [];
    if (consultant[0]?.email) recipients.push({ to: consultant[0].email, name: consultant[0].name });
    if ((employer as { name: string; email: string }[])[0]?.email) {
      const e = (employer as { name: string; email: string }[])[0];
      recipients.push({ to: e.email, name: e.name });
    }
    if (row.candidateEmail) recipients.push({ to: row.candidateEmail, name: row.candidateName });

    await Promise.allSettled(recipients.map(r => sendEmail({
      to: r.to,
      subject: `Interview confirmed — ${row.candidateName} for ${row.jobTitle}`,
      html: `<p>Hi ${r.name?.split(' ')[0] || ''},</p><p>The interview for <strong>${row.candidateName}</strong> — <strong>${row.jobTitle}</strong> at ${row.company} is confirmed for:</p><p style="font-size:16px;font-weight:700;">${dateStr}</p><p>Interviewer: ${interviewerName}${interviewerDesignation ? ` (${interviewerDesignation})` : ''}</p>`,
    }).catch(e => console.error('interview.confirm.email.error', e))));

    res.json({ ok: true, status: 'confirmed' });
  } catch (err) {
    console.error('[employer.interview.respond] ERROR:', err);
    res.status(500).json({ error: 'Failed to respond to interview proposal' });
  }
}
