/**
 * PUT /api/submissions/:id/status
 * Employer (or admin) updates the ATS pipeline status of a submission.
 * Fires notification emails to candidate, consultant, and employer on every change.
 *
 * Body: { status: SubmissionStatus }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, job, user, placement, candidateProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { isReadOnlyOrgViewer } from '@/server/lib/orgPermissions.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';
import { logAudit } from '@/lib/audit.js';

const VALID_STATUSES = [
  'pending', 'review', 'shortlisted', 'interview', 'hold',
  'selected', 'offered', 'rejected',
  'payment_processed', 'payment_done',
] as const;
type SubmissionStatus = typeof VALID_STATUSES[number];

// ── Brand colours ─────────────────────────────────────────────────────────────
const ORANGE = '#E8470A';
const PURPLE = '#6B4FBB';
const BG     = '#080808';
const CARD   = '#111111';
const TEXT   = '#f0f0f0';
const MUTED  = '#888888';
const BASE   = 'https://tricci.in';

// ── Status display config ─────────────────────────────────────────────────────
const STATUS_META: Record<SubmissionStatus, {
  label: string;
  emoji: string;
  candidateSubject: string;
  candidateHeadline: string;
  candidateBody: string;
  consultantSubject: string;
  consultantHeadline: string;
  consultantBody: string;
  employerSubject: string;
  employerHeadline: string;
  employerBody: string;
  color: string;
  // payment stages are not sent to candidates
  skipCandidate?: boolean;
}> = {
  pending: {
    label: 'Submitted', emoji: '📋', color: '#888888',
    candidateSubject: 'Your profile has been submitted',
    candidateHeadline: 'Your CV is with the employer',
    candidateBody: 'Your profile has been submitted for review. We\'ll keep you updated as things progress.',
    consultantSubject: 'Submission confirmed',
    consultantHeadline: 'Candidate submitted successfully',
    consultantBody: 'Your candidate submission has been received and is pending employer review.',
    employerSubject: 'New candidate submission received',
    employerHeadline: 'A new CV has landed in your ATS',
    employerBody: 'A consultant has submitted a candidate for your review. Log in to your dashboard to view the profile.',
  },
  review: {
    label: 'In Review', emoji: '🔍', color: '#eab308',
    candidateSubject: 'Your profile is under review',
    candidateHeadline: 'The employer is reviewing your profile',
    candidateBody: 'Great news — your profile is actively being reviewed by the employer. Stay tuned!',
    consultantSubject: 'Candidate profile is under review',
    consultantHeadline: 'Employer is reviewing your submission',
    consultantBody: 'The employer has started reviewing the candidate profile you submitted.',
    employerSubject: 'Submission marked as In Review',
    employerHeadline: 'Candidate is now in review',
    employerBody: 'The submission status has been updated to In Review in your ATS pipeline.',
  },
  shortlisted: {
    label: 'Shortlisted', emoji: '⭐', color: ORANGE,
    candidateSubject: 'You\'ve been shortlisted! 🎉',
    candidateHeadline: 'Congratulations — you\'re shortlisted!',
    candidateBody: 'The employer has shortlisted your profile. You\'re one step closer to your next opportunity. Expect to hear about interview details soon.',
    consultantSubject: 'Your candidate has been shortlisted',
    consultantHeadline: 'Candidate shortlisted by employer',
    consultantBody: 'The employer has shortlisted the candidate you submitted. Great work — the next step is interview scheduling.',
    employerSubject: 'Candidate shortlisted',
    employerHeadline: 'Shortlist confirmed in ATS',
    employerBody: 'The candidate has been marked as shortlisted. Schedule an interview from your ATS dashboard.',
  },
  interview: {
    label: 'Interview', emoji: '🗓️', color: PURPLE,
    candidateSubject: 'Interview stage — you\'re in!',
    candidateHeadline: 'You\'ve been called for an interview',
    candidateBody: 'The employer has moved your profile to the interview stage. Prepare well — you\'ve got this! Check your dashboard for any interview details shared.',
    consultantSubject: 'Candidate moved to Interview stage',
    consultantHeadline: 'Interview stage reached',
    consultantBody: 'Your candidate has been moved to the interview stage. Coordinate with the candidate to ensure they\'re prepared.',
    employerSubject: 'Candidate in Interview stage',
    employerHeadline: 'Interview stage updated in ATS',
    employerBody: 'The candidate\'s status has been updated to Interview. Use the Interview Panel tab to schedule and track rounds.',
  },
  hold: {
    label: 'On Hold', emoji: '⏸️', color: '#94a3b8',
    candidateSubject: 'Update on your application',
    candidateHeadline: 'Your application is on hold',
    candidateBody: 'The employer has placed a hold on this role for now. This isn\'t a rejection — we\'ll update you as soon as there\'s movement.',
    consultantSubject: 'Candidate placed on hold',
    consultantHeadline: 'Interview outcome: On Hold',
    consultantBody: 'The employer has placed this candidate on hold after the interview. No action needed right now — we\'ll notify you of any updates.',
    employerSubject: 'Candidate marked as On Hold',
    employerHeadline: 'Hold status recorded in ATS',
    employerBody: 'The candidate has been marked as On Hold following the interview.',
  },
  selected: {
    label: 'Selected', emoji: '✅', color: '#22c55e',
    candidateSubject: 'You\'ve been selected! 🎊',
    candidateHeadline: 'Offer incoming — you\'ve been selected!',
    candidateBody: 'Fantastic news! The employer has selected you after the interview process. An offer will be shared with you shortly. Congratulations!',
    consultantSubject: 'Your candidate has been selected!',
    consultantHeadline: 'Placement confirmed — candidate selected',
    consultantBody: 'Excellent work! The employer has selected the candidate you submitted. An offer will be issued shortly. Your placement fee will be processed upon joining.',
    employerSubject: 'Candidate selected',
    employerHeadline: 'Selection confirmed in ATS',
    employerBody: 'The candidate has been marked as selected. Proceed to create and send an offer letter from the Offers tab.',
  },
  offered: {
    label: 'Offered', emoji: '📄', color: '#3b82f6',
    candidateSubject: 'Offer letter sent to you',
    candidateHeadline: 'Your offer letter is on its way',
    candidateBody: 'The employer has issued an offer letter for you. Please review it carefully and respond at your earliest. Reach out to your consultant if you have any questions.',
    consultantSubject: 'Offer issued to your candidate',
    consultantHeadline: 'Offer letter sent to candidate',
    consultantBody: 'The employer has issued an offer letter to your candidate. Follow up to ensure a smooth acceptance and joining process.',
    employerSubject: 'Offer letter issued',
    employerHeadline: 'Offer stage updated in ATS',
    employerBody: 'The offer letter has been issued. Track acceptance status in the Offers tab of your ATS dashboard.',
  },
  rejected: {
    label: 'Rejected', emoji: '❌', color: '#ef4444',
    candidateSubject: 'Application update from TRICCI',
    candidateHeadline: 'Thank you for your time',
    candidateBody: 'After careful consideration, the employer has decided not to move forward with your application at this time. Don\'t be discouraged — new opportunities are added daily. Keep your profile updated and apply to more roles.',
    consultantSubject: 'Candidate not selected',
    consultantHeadline: 'Submission rejected by employer',
    consultantBody: 'The employer has decided not to proceed with this candidate. Review feedback if available and consider re-submitting for other open roles.',
    employerSubject: 'Candidate marked as rejected',
    employerHeadline: 'Rejection recorded in ATS',
    employerBody: 'The candidate has been marked as rejected in your ATS pipeline.',
  },
  payment_processed: {
    label: 'Payment Processed', emoji: '💳', color: '#a855f7',
    skipCandidate: true,
    candidateSubject: '', candidateHeadline: '', candidateBody: '',
    consultantSubject: 'Payment has been processed',
    consultantHeadline: 'Your placement fee is being processed',
    consultantBody: 'The employer has confirmed the candidate\'s joining and your placement fee is now being processed. You\'ll receive the payout within the agreed SLA.',
    employerSubject: 'Placement fee payment processed',
    employerHeadline: 'Payment processing confirmed',
    employerBody: 'The placement fee for this candidate has been marked as payment processed. The consultant will be notified.',
  },
  payment_done: {
    label: 'Payment Done', emoji: '✅💰', color: '#22c55e',
    skipCandidate: true,
    candidateSubject: '', candidateHeadline: '', candidateBody: '',
    consultantSubject: 'Payment completed — funds transferred',
    consultantHeadline: 'Your placement fee has been paid!',
    consultantBody: 'Your placement fee for this successful hire has been fully paid. Thank you for your partnership with TRICCI. Keep submitting great candidates!',
    employerSubject: 'Placement fee payment completed',
    employerHeadline: 'Payment cycle closed',
    employerBody: 'The placement fee for this hire has been fully settled. The consultant has been notified. Thank you for using TRICCI.',
  },
};

// ── Email builder ─────────────────────────────────────────────────────────────
function buildEmail(opts: {
  recipientName: string;
  headline: string;
  body: string;
  candidateName: string;
  jobTitle: string;
  company: string;
  status: SubmissionStatus;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const meta = STATUS_META[opts.status];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${opts.headline}</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:48px 16px 64px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
        <tr><td style="height:3px;background:linear-gradient(90deg,${ORANGE} 0%,${PURPLE} 100%);border-radius:3px 3px 0 0;"></td></tr>
        <tr><td style="background:${CARD};border-radius:0 0 20px 20px;border:1px solid #ffffff0d;border-top:none;padding:36px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:${meta.color};text-transform:uppercase;">${meta.emoji} &nbsp;${meta.label}</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:${TEXT};line-height:1.3;">${opts.headline}</h1>
          <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">Hi <strong style="color:${TEXT};">${opts.recipientName}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:${MUTED};line-height:1.6;">${opts.body}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#181818;border:1px solid #ffffff0f;border-radius:14px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;color:${MUTED};text-transform:uppercase;">Submission Details</p>
              <p style="margin:0 0 4px;font-size:13px;color:${TEXT};"><strong>Candidate:</strong> ${opts.candidateName}</p>
              <p style="margin:0 0 4px;font-size:13px;color:${TEXT};"><strong>Role:</strong> ${opts.jobTitle}</p>
              <p style="margin:0;font-size:13px;color:${TEXT};"><strong>Company:</strong> ${opts.company}</p>
            </td></tr>
          </table>
          <a href="${opts.ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,${ORANGE} 0%,${PURPLE} 100%);color:#ffffff;font-size:14px;font-weight:800;padding:14px 32px;border-radius:12px;text-decoration:none;">${opts.ctaLabel}</a>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#444;">© 2025 TRICCI · <a href="${BASE}" style="color:#555;text-decoration:none;">tricci.in</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Employer access required' });
    }
    if (role === 'employer' && await isReadOnlyOrgViewer(session.user.id)) {
      return res.status(403).json({ error: 'read_only', message: 'Viewer accounts have read-only access' });
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid submission ID' });

    const { status, rejectionReason } = req.body as { status: string; rejectionReason?: string };
    if (!VALID_STATUSES.includes(status as SubmissionStatus)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (status === 'rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({ error: 'rejection_reason_required', message: 'Please provide a reason for rejecting this candidate' });
    }

    // ── Fetch submission + job + consultant + employer details ────────────────
    const [row] = await db
      .select({
        submissionId: submission.id,
        candidateName: submission.candidateName,
        candidateEmail: submission.candidateEmail,
        currentStatus: submission.status,
        jobId: submission.jobId,
        consultantUserId: submission.consultantUserId,
        jobTitle: job.title,
        company: job.company,
        postedByUserId: job.postedByUserId,
      })
      .from(submission)
      .leftJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ error: 'Submission not found' });
    if (role === 'employer' && row.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'You can only update submissions for your own jobs' });
    }

    // ── Update status ─────────────────────────────────────────────────────────
    await db
      .update(submission)
      .set({ status: status as SubmissionStatus, updatedAt: new Date(), ...(status === 'rejected' ? { rejectionReason: rejectionReason!.trim() } : {}) })
      .where(eq(submission.id, id));

    logAudit({
      entityType: 'submission',
      entityId: String(id),
      action: 'submission.status_changed',
      actorUserId: session.user.id,
      actorRole: role,
      metadata: { from: row.currentStatus, to: status, jobId: row.jobId, jobTitle: row.jobTitle, candidateName: row.candidateName },
    });

    // ── Fetch stakeholder emails in parallel ──────────────────────────────────
    const [consultantUser, employerUser] = await Promise.all([
      db.select({ name: user.name, email: user.email })
        .from(user).where(eq(user.id, row.consultantUserId)).limit(1),
      row.postedByUserId
        ? db.select({ name: user.name, email: user.email })
            .from(user).where(eq(user.id, row.postedByUserId)).limit(1)
        : Promise.resolve([]),
    ]);

    const consultant = consultantUser[0];
    const employer   = (employerUser as { name: string; email: string }[])[0];
    const meta       = STATUS_META[status as SubmissionStatus];
    const jobTitle   = row.jobTitle ?? 'the role';
    const company    = row.company ?? 'the company';

    // ── Fire emails (non-blocking — don't fail the API if email fails) ────────
    const emailPromises: Promise<unknown>[] = [];

    // Candidate email (skip for payment stages)
    if (!meta.skipCandidate && row.candidateEmail) {
      emailPromises.push(
        sendEmail({
          to: row.candidateEmail,
          subject: `${meta.emoji} ${meta.candidateSubject} — ${jobTitle} at ${company}`,
          html: buildEmail({
            recipientName: row.candidateName.split(' ')[0],
            headline: meta.candidateHeadline,
            body: meta.candidateBody,
            candidateName: row.candidateName,
            jobTitle,
            company,
            status: status as SubmissionStatus,
            ctaLabel: 'View My Applications',
            ctaUrl: `${BASE}/candidate/profile`,
          }),
        }).catch(e => console.error('ats.email.candidate.error', e))
      );
    }

    // Consultant email
    if (consultant?.email) {
      emailPromises.push(
        sendEmail({
          to: consultant.email,
          subject: `${meta.emoji} ${meta.consultantSubject} — ${row.candidateName} for ${jobTitle}`,
          html: buildEmail({
            recipientName: consultant.name.split(' ')[0],
            headline: meta.consultantHeadline,
            body: meta.consultantBody,
            candidateName: row.candidateName,
            jobTitle,
            company,
            status: status as SubmissionStatus,
            ctaLabel: 'View Submissions',
            ctaUrl: `${BASE}/consultant/dashboard`,
          }),
        }).catch(e => console.error('ats.email.consultant.error', e))
      );
    }

    // Employer email
    if (employer?.email) {
      emailPromises.push(
        sendEmail({
          to: employer.email,
          subject: `${meta.emoji} ${meta.employerSubject} — ${row.candidateName}`,
          html: buildEmail({
            recipientName: employer.name.split(' ')[0],
            headline: meta.employerHeadline,
            body: meta.employerBody,
            candidateName: row.candidateName,
            jobTitle,
            company,
            status: status as SubmissionStatus,
            ctaLabel: 'Open ATS Dashboard',
            ctaUrl: `${BASE}/employer/dashboard`,
          }),
        }).catch(e => console.error('ats.email.employer.error', e))
      );
    }

    await Promise.allSettled(emailPromises);

    // ── Auto-record placement on selection, mark paid separately ──────────────
    // Point 52: payment term counts from joining/selection, not from when
    // payment eventually happens — so the placement record (with fee split
    // and due-date basis) is created at 'selected', and 'payment_done' just
    // flips paymentStatus on the existing row rather than creating it late.
    if (status === 'selected' || status === 'payment_done') {
      try {
        const existing = await db
          .select({ id: placement.id, paymentStatus: placement.paymentStatus })
          .from(placement)
          .where(eq(placement.submissionId, id))
          .limit(1);

        if (existing.length === 0) {
          // Fetch candidate CTC for fee calculation
          let ctcLpa: number | null = null;
          if (row.candidateEmail) {
            const [cp] = await db
              .select({ currentCTC: candidateProfile.currentCTC })
              .from(candidateProfile)
              .leftJoin(user, eq(candidateProfile.userId, user.id))
              .where(eq(user.email, row.candidateEmail))
              .limit(1);
            if (cp?.currentCTC) ctcLpa = cp.currentCTC / 100000; // stored as paise-equivalent
          }

          // Fetch job fee percent + payment term
          const [jobRow] = await db
            .select({ feePercent: job.feePercent, paymentTermDays: job.paymentTermDays })
            .from(job)
            .where(eq(job.id, row.jobId))
            .limit(1);

          const feePercent = jobRow?.feePercent ?? null;
          const feeAmountLpa = ctcLpa && feePercent ? (ctcLpa * feePercent) / 100 : null;
          // Point 28/49: platform keeps a flat 2%, consultant gets the rest
          const PLATFORM_CUT = 2;
          const consultantFeePercent = feePercent != null ? Math.max(feePercent - PLATFORM_CUT, 0) : null;
          const consultantFeeAmountLpa = ctcLpa && consultantFeePercent != null ? (ctcLpa * consultantFeePercent) / 100 : null;

          await db.insert(placement).values({
            submissionId: id,
            jobId: row.jobId,
            jobTitle: row.jobTitle ?? 'Unknown Role',
            companyName: row.company ?? 'Unknown Company',
            candidateName: row.candidateName,
            candidateEmail: row.candidateEmail,
            consultantUserId: row.consultantUserId,
            consultantName: consultant?.name ?? null,
            employerUserId: row.postedByUserId ?? null,
            ctcLpa,
            feePercent,
            feeAmountLpa,
            platformFeePercent: PLATFORM_CUT,
            consultantFeePercent,
            consultantFeeAmountLpa,
            paymentTermDays: jobRow?.paymentTermDays ?? 45,
            paymentStatus: status === 'payment_done' ? 'paid' : 'pending',
            placedAt: new Date(),
          });
          console.log(`[placement] recorded for submission ${id} — ${row.candidateName} at ${row.company}`);
        } else if (status === 'payment_done' && existing[0].paymentStatus !== 'paid') {
          await db.update(placement).set({ paymentStatus: 'paid' }).where(eq(placement.submissionId, id));
          console.log(`[placement] marked paid for submission ${id}`);
        }
      } catch (placementErr) {
        // Non-fatal — don't fail the status update if placement recording fails
        console.error('[placement] failed to record placement:', placementErr);
      }
    }

      // Sync shortlist status to interview pipeline counter (Anomaly #4)
      if (newStatus === 'shortlisted') {
            await db
              .update(jobTable)
              .set({ applicants: sql`${jobTable.applicants} + 1` })
              .where(eq(jobTable.id, submissionRecord.jobId))
              .catch(err => console.error('[submissions] interview sync failed:', err));
      }

    res.json({ ok: true, id, status });
  } catch (err) {
    console.error('submissions.status.put.error', err);
    res.status(500).json({ error: 'Failed to update submission status' });
  }
}
