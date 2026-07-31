/**
 * PUT /api/employer/applications/:id/status
 * Employer shortlists or rejects a direct candidate application.
 *
 * Body: { status: 'shortlisted' | 'rejected' }
 *
 * When status = 'shortlisted', the response includes the candidate's
 * real (unmasked) contact details so the employer can reach out directly.
 * For all other statuses, contact details remain masked.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateApplication, job, user, candidateProfile } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';
import { logAudit } from '@/lib/audit.js';

const VALID_STATUSES = ['shortlisted', 'rejected', 'placed'] as const;
type AppStatus = typeof VALID_STATUSES[number];

const BASE = 'https://tricci.in';
const ORANGE = '#E8470A';
const PURPLE = '#6B4FBB';
const BG = '#080808';
const CARD = '#111111';
const TEXT = '#f0f0f0';
const MUTED = '#888888';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Employer access required' });
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid application ID' });

    const { status, rejectionReason } = req.body as { status: string; rejectionReason?: string };
    if (!VALID_STATUSES.includes(status as AppStatus)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    // Point 8: rejection reason is mandatory before it's recorded
    if (status === 'rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({ error: 'rejection_reason_required', message: 'Please provide a reason for rejecting this candidate' });
    }

    // Fetch the application + job + candidate details
    const [row] = await db
      .select({
        appId: candidateApplication.id,
        currentStatus: candidateApplication.status,
        jobId: candidateApplication.jobId,
        candidateUserId: candidateApplication.candidateUserId,
        jobTitle: job.title,
        company: job.company,
        postedByUserId: job.postedByUserId,
        candidateName: user.name,
        candidateEmail: user.email,
        candidatePhone: candidateProfile.phone,
        candidateTitle: candidateProfile.currentTitle,
      })
      .from(candidateApplication)
      .innerJoin(job, eq(candidateApplication.jobId, job.id))
      .innerJoin(user, eq(candidateApplication.candidateUserId, user.id))
      .leftJoin(candidateProfile, eq(candidateProfile.userId, candidateApplication.candidateUserId))
      .where(
        role === 'employer'
          ? and(eq(candidateApplication.id, id), eq(job.postedByUserId, session.user.id))
          : eq(candidateApplication.id, id),
      )
      .limit(1);

    if (!row) return res.status(404).json({ error: 'Application not found' });

    // Update status
    await db
      .update(candidateApplication)
      .set({ status: status as AppStatus, updatedAt: new Date(), ...(status === 'rejected' ? { rejectionReason: rejectionReason!.trim() } : {}) })
      .where(eq(candidateApplication.id, id));

    logAudit({
      entityType: 'application',
      entityId: String(id),
      action: 'application.status_changed',
      actorUserId: session.user.id,
      actorRole: role,
      metadata: { from: row.currentStatus, to: status, jobId: row.jobId, jobTitle: row.jobTitle },
    });

    // Fire notification email to candidate (non-blocking)
    if (row.candidateEmail) {
      const isShortlisted = status === 'shortlisted';
      const subject = isShortlisted
        ? `🎉 You've been shortlisted for ${row.jobTitle} at ${row.company}`
        : `Application update — ${row.jobTitle} at ${row.company}`;

      const headline = isShortlisted
        ? 'Congratulations — you\'ve been shortlisted!'
        : 'Thank you for your application';

      const body = isShortlisted
        ? `Great news! The employer has shortlisted your direct application for <strong style="color:${TEXT};">${row.jobTitle}</strong> at <strong style="color:${TEXT};">${row.company}</strong>. They will be in touch with you shortly to discuss next steps.`
        : `After careful review, the employer has decided not to move forward with your application for <strong style="color:${TEXT};">${row.jobTitle}</strong> at <strong style="color:${TEXT};">${row.company}</strong> at this time. Don't be discouraged — keep applying to other open roles on TRICCI.`;

      const statusColor = isShortlisted ? ORANGE : '#ef4444';
      const statusLabel = isShortlisted ? '⭐ Shortlisted' : '❌ Not Selected';

      sendEmail({
        to: row.candidateEmail,
        subject,
        html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${headline}</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:48px 16px 64px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
        <tr><td style="height:3px;background:linear-gradient(90deg,${ORANGE} 0%,${PURPLE} 100%);border-radius:3px 3px 0 0;"></td></tr>
        <tr><td style="background:${CARD};border-radius:0 0 20px 20px;border:1px solid #ffffff0d;border-top:none;padding:36px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:${statusColor};text-transform:uppercase;">${statusLabel}</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:${TEXT};line-height:1.3;">${headline}</h1>
          <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">Hi <strong style="color:${TEXT};">${row.candidateName.split(' ')[0]}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:${MUTED};line-height:1.6;">${body}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#181818;border:1px solid #ffffff0f;border-radius:14px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:1px;color:${MUTED};text-transform:uppercase;">Application Details</p>
              <p style="margin:0 0 4px;font-size:13px;color:${TEXT};"><strong>Role:</strong> ${row.jobTitle}</p>
              <p style="margin:0;font-size:13px;color:${TEXT};"><strong>Company:</strong> ${row.company}</p>
            </td></tr>
          </table>
          <a href="${BASE}/candidate/profile" style="display:inline-block;background:linear-gradient(135deg,${ORANGE} 0%,${PURPLE} 100%);color:#ffffff;font-size:14px;font-weight:800;padding:14px 32px;border-radius:12px;text-decoration:none;">View My Applications</a>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#444;">© 2025 TRICCI · <a href="${BASE}" style="color:#555;text-decoration:none;">tricci.in</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }).catch(e => console.error('[employer.applications.status] email error:', e));
    }

    // Point 9-12: contact details stay masked even on shortlist. Employer
    // must file a separate unlock request; only Admin can release real
    // contact info, and only after payment is confirmed. (Previously this
    // endpoint returned unmasked contact details immediately on shortlist —
    // that was a real gap against the masking requirement, fixed here.)
    res.json({ ok: true, id, status });
  } catch (err) {
    console.error('[employer.applications.status] ERROR:', err);
    res.status(500).json({ error: 'Failed to update application status' });
  }
}
