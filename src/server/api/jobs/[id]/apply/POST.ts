/**
 * POST /api/jobs/:id/apply
 * Candidate self-applies to a job.
 * Creates a candidateApplication row (unique per candidate+job).
 * Increments job.applicants counter.
 * Sends confirmation email to candidate + notification to employer (SOP §24).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateApplication, job, user } from '@/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';

const ORANGE = '#E8470A';
const PURPLE = '#6B4FBB';
const BG = '#080808';
const CARD = '#111111';
const TEXT = '#f0f0f0';
const MUTED = '#888888';
const BASE = 'https://tricci.in';

function buildCandidateConfirmEmail(candidateName: string, jobTitle: string, company: string): string {
  const firstName = candidateName.split(' ')[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Application Submitted</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:48px 16px 64px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
        <tr><td style="height:3px;background:linear-gradient(90deg,${ORANGE} 0%,${PURPLE} 100%);border-radius:3px 3px 0 0;"></td></tr>
        <tr><td style="background:${CARD};border-radius:0 0 20px 20px;border:1px solid #ffffff0d;border-top:none;padding:36px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:${ORANGE};text-transform:uppercase;">✦ &nbsp;Application Submitted</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:${TEXT};line-height:1.25;">
            ${firstName}, you're in the running! 🎯
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:${MUTED};line-height:1.6;">
            Your application for <strong style="color:${TEXT};">${jobTitle}</strong> at <strong style="color:${TEXT};">${company}</strong> has been successfully submitted.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#181818;border:1px solid #ffffff0f;border-radius:14px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1px;color:${MUTED};text-transform:uppercase;">What happens next</p>
              <p style="margin:0 0 8px;font-size:13px;color:${TEXT};line-height:1.6;">📋 &nbsp;The employer will review your profile and CV.</p>
              <p style="margin:0 0 8px;font-size:13px;color:${TEXT};line-height:1.6;">📞 &nbsp;If shortlisted, you'll be contacted for an interview.</p>
              <p style="margin:0;font-size:13px;color:${TEXT};line-height:1.6;">📊 &nbsp;Track your application status in your <a href="${BASE}/candidate/profile" style="color:${ORANGE};text-decoration:none;">dashboard</a>.</p>
            </td></tr>
          </table>
          <a href="${BASE}/jobs" style="display:inline-block;background:linear-gradient(135deg,${ORANGE} 0%,${PURPLE} 100%);color:#ffffff;font-size:14px;font-weight:800;padding:14px 32px;border-radius:12px;text-decoration:none;">
            Browse More Jobs →
          </a>
          <p style="margin:28px 0 0;font-size:13px;color:${MUTED};">Best of luck,<br/><strong style="color:${ORANGE};">The TRICCI Team</strong></p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#333333;">© 2026 TRICCI · <a href="${BASE}" style="color:#555555;text-decoration:none;">tricci.in</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function buildEmployerNotificationEmail(
  employerName: string,
  candidateName: string,
  jobTitle: string,
  dashboardUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>New Application</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:48px 16px 64px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
        <tr><td style="height:3px;background:linear-gradient(90deg,#35c9ff 0%,${PURPLE} 100%);border-radius:3px 3px 0 0;"></td></tr>
        <tr><td style="background:${CARD};border-radius:0 0 20px 20px;border:1px solid #ffffff0d;border-top:none;padding:36px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#35c9ff;text-transform:uppercase;">✦ &nbsp;New Application Received</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:${TEXT};line-height:1.25;">
            ${employerName.split(' ')[0]}, a candidate just applied! 📬
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:${MUTED};line-height:1.6;">
            <strong style="color:${TEXT};">${candidateName}</strong> has applied for <strong style="color:${TEXT};">${jobTitle}</strong>.
          </p>
          <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#35c9ff 0%,${PURPLE} 100%);color:#ffffff;font-size:14px;font-weight:800;padding:14px 32px;border-radius:12px;text-decoration:none;">
            Review Application →
          </a>
          <p style="margin:28px 0 0;font-size:13px;color:${MUTED};">— <strong style="color:${ORANGE};">The TRICCI Team</strong></p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#333333;">© 2026 TRICCI · <a href="${BASE}" style="color:#555555;text-decoration:none;">tricci.in</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const role = (session.user as { role?: string }).role;
    if (role !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can apply to jobs' });
    }

    const jobId = String(req.params.id);
    const { coverNote, cvUrl, cvFileName, cvMatchScore } = req.body as {
      coverNote?: string;
      cvUrl?: string;
      cvFileName?: string;
      cvMatchScore?: number;
    };

    // Only accept a per-application CV if it looks like a URL our own
    // upload/enhance endpoints would have produced — prevents arbitrary
    // URL injection into candidateApplication.cv_url.
    const safeCvUrl = typeof cvUrl === 'string' && cvUrl.startsWith('/airo-assets/uploads/cvs/') ? cvUrl : null;
    const safeCvFileName = safeCvUrl && typeof cvFileName === 'string' ? cvFileName.slice(0, 255) : null;
    const safeMatchScore = safeCvUrl && typeof cvMatchScore === 'number' && Number.isFinite(cvMatchScore)
      ? Math.max(0, Math.min(100, Math.round(cvMatchScore)))
      : null;

    // Verify job exists and is active
    const [jobRow] = await db
      .select({
        id: job.id,
        status: job.status,
        title: job.title,
        company: job.company,
        postedByUserId: job.postedByUserId,
      })
      .from(job).where(eq(job.id, jobId)).limit(1);

    if (!jobRow) return res.status(404).json({ error: 'Job not found' });
    if (jobRow.status !== 'active') return res.status(400).json({ error: 'This job is no longer accepting applications' });

    // Insert — UNIQUE KEY (job_id, candidate_user_id) prevents duplicates
    try {
      await db.insert(candidateApplication).values({
        jobId,
        candidateUserId: session.user.id,
        status: 'applied',
        coverNote: coverNote?.trim() || null,
        cvUrl: safeCvUrl,
        cvFileName: safeCvFileName,
        cvMatchScore: safeMatchScore,
      });
    } catch (insertErr: unknown) {
      const mysqlErr = insertErr as { code?: string; errno?: number };
      if (mysqlErr?.errno === 1062 || mysqlErr?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'already_applied', message: 'You have already applied to this job' });
      }
      throw insertErr;
    }

    // Increment applicants counter on the job
    await db.update(job)
      .set({ applicants: sql`applicants + 1` })
      .where(eq(job.id, jobId));

    res.status(201).json({ ok: true, message: 'Application submitted successfully' });

    // ── Fire-and-forget emails (SOP §24) ──────────────────────────────────────
    try {
      // Fetch candidate name + email
      const [candidateUser] = await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);

      if (candidateUser) {
        // 1. Confirmation to candidate
        sendEmail({
          to: candidateUser.email,
          subject: `Application submitted — ${jobRow.title} at ${jobRow.company}`,
          html: buildCandidateConfirmEmail(candidateUser.name, jobRow.title, jobRow.company),
          text: `Hi ${candidateUser.name},\n\nYour application for ${jobRow.title} at ${jobRow.company} has been submitted.\n\nTrack your status at: ${BASE}/candidate/profile\n\n— The TRICCI Team`,
        }).catch(e => console.error('[apply] candidate email failed:', e));

        // 2. Notification to employer
        if (jobRow.postedByUserId) {
          const [employerUser] = await db
            .select({ name: user.name, email: user.email })
            .from(user)
            .where(eq(user.id, jobRow.postedByUserId))
            .limit(1);

          if (employerUser) {
            sendEmail({
              to: employerUser.email,
              subject: `New application for ${jobRow.title} — ${candidateUser.name}`,
              html: buildEmployerNotificationEmail(
                employerUser.name,
                candidateUser.name,
                jobRow.title,
                `${BASE}/employer/dashboard`,
              ),
              text: `Hi ${employerUser.name},\n\n${candidateUser.name} has applied for ${jobRow.title}.\n\nReview at: ${BASE}/employer/dashboard\n\n— The TRICCI Team`,
            }).catch(e => console.error('[apply] employer email failed:', e));
          }
        }
      }
    } catch (emailErr) {
      console.error('[apply] email dispatch error:', emailErr);
    }
  } catch (err) {
    console.error('jobs.apply.error', err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
}
