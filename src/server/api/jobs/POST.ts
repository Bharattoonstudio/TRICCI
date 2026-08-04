import type { Request, Response } from 'express';
import { randomInt } from 'crypto';
import { db } from '../../db/client.js';
import { job as jobTable, employerProfile, user } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { notifyMatchingSubscribers } from '../../lib/jobAlertMatcher.js';
import { logAudit } from '@/lib/audit.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';
import { hasSignedAgreement } from '@/server/lib/requireAgreement.js';
import { isReadOnlyOrgViewer } from '@/server/lib/orgPermissions.js';
import type { Job } from './GET.js';

const ORANGE = '#E8470A';
const PURPLE = '#6B4FBB';
const BASE = 'https://tricci.in';

function buildJobPostedEmail(employerName: string, jobTitle: string, jobCode: string, dashboardUrl: string): string {
  const firstName = employerName.split(' ')[0];
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>Job Posted</title></head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:48px 16px 64px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
        <tr><td style="height:3px;background:linear-gradient(90deg,${ORANGE} 0%,${PURPLE} 100%);border-radius:3px 3px 0 0;"></td></tr>
        <tr><td style="background:#111111;border-radius:0 0 20px 20px;border:1px solid #ffffff0d;border-top:none;padding:36px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:${ORANGE};text-transform:uppercase;">✦ &nbsp;Job Posted Successfully</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:#f0f0f0;line-height:1.25;">
            ${firstName}, your job is now live! 🚀
          </h1>
          <p style="margin:0 0 8px;font-size:15px;color:#888888;line-height:1.6;">
            <strong style="color:#f0f0f0;">${jobTitle}</strong> has been published and is now visible to verified consultants and candidates on TRICCI.
          </p>
          <p style="margin:0 0 24px;font-size:13px;color:#888888;">Job Code: <strong style="color:#f0f0f0;">${jobCode}</strong></p>
          <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,${ORANGE} 0%,${PURPLE} 100%);color:#ffffff;font-size:14px;font-weight:800;padding:14px 32px;border-radius:12px;text-decoration:none;">
            View Your Dashboard →
          </a>
          <p style="margin:28px 0 0;font-size:13px;color:#888888;">— <strong style="color:${ORANGE};">The TRICCI Team</strong></p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#333333;">© 2026 TRICCI · <a href="${BASE}" style="color:#555555;text-decoration:none;">tricci.in</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function uniqueId(title: string, location: string): string {
  const base = `${slugify(title)}-${slugify(location)}`;
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
}

export default async function handler(req: Request, res: Response) {
  try {
    // Auth guard — only authenticated employers (or admins) may post jobs
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Only employers may post jobs' });
    }
    if (role === 'employer' && !(await hasSignedAgreement(session.user.id, 'employer'))) {
      return res.status(403).json({ error: 'agreement_required', message: 'Please accept the TRICCI agreement before posting jobs' });
    }
    if (role === 'employer' && await isReadOnlyOrgViewer(session.user.id)) {
      return res.status(403).json({ error: 'read_only', message: 'Viewer accounts have read-only access and cannot post jobs' });
    }

    const {
      title,
      department,
      location,
      locationType,
      ctcMin,
      ctcMax,
      description,
      skills,
      feePercent,
      experience,
      experienceYears,
      category,
      responsibilities,
      requirements,
      interviewRounds,
      jobCode: providedJobCode,
      visibility: rawVisibility,
      paymentTermDays: rawPaymentTermDays,
    } = req.body as Record<string, unknown>;

    // Validate required fields
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!location || typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({ error: 'location is required' });
    }

    const ctcMinNum = Number(ctcMin) || 0;
    const ctcMaxNum = Number(ctcMax) || 0;
    // Point 52: payment term is either 45 or 90 days — anything else falls
    // back to the safe default rather than trusting an arbitrary number.
    const paymentTermDaysNum = [45, 90].includes(Number(rawPaymentTermDays)) ? Number(rawPaymentTermDays) : 45;
    // Point 85: commission range is 5-35%. Clamp server-side too, since the
    // frontend slider is a UI convenience, not a security boundary.
    const feeNum = Math.min(35, Math.max(5, Number(feePercent) || 8.5));
    const expYears = Number(experienceYears) || 0;

    const skillsArr: string[] = Array.isArray(skills)
      ? (skills as string[])
      : typeof skills === 'string' && skills.trim()
        ? skills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

    const responsibilitiesArr: string[] = Array.isArray(responsibilities)
      ? (responsibilities as string[])
      : typeof responsibilities === 'string' && responsibilities.trim()
        ? responsibilities.split('\n').map((s: string) => s.trim()).filter(Boolean)
        : [];

    const requirementsArr: string[] = Array.isArray(requirements)
      ? (requirements as string[])
      : typeof requirements === 'string' && requirements.trim()
        ? requirements.split('\n').map((s: string) => s.trim()).filter(Boolean)
        : [];

    const roundsArr: { label: string; description: string }[] = Array.isArray(interviewRounds)
      ? (interviewRounds as { label: string; description: string }[])
      : [];

    const VALID_VISIBILITY = ['public', 'consultant_only', 'confidential'] as const;
    const visibility = typeof rawVisibility === 'string' && (VALID_VISIBILITY as readonly string[]).includes(rawVisibility)
      ? rawVisibility
      : 'public';

    const id = uniqueId(String(title), String(location));

    // Resolve company name from employer profile; fall back to 'Confidential'
    let companyName = 'Confidential';
    try {
      const [profile] = await db
        .select({ companyName: employerProfile.companyName })
        .from(employerProfile)
        .where(eq(employerProfile.userId, session.user.id))
        .limit(1);
      if (profile?.companyName) companyName = profile.companyName;
    } catch {
      // Non-fatal — use fallback
    }

    // Use provided job code or generate one with crypto.randomInt (never Math.random)
    const year = new Date().getFullYear();
    const num = String(randomInt(1000, 10000));
    const jobCode = typeof providedJobCode === 'string' && providedJobCode.trim()
      ? providedJobCode.trim()
      : `TRC-${year}-${num}`;
    const ctcLabel = ctcMinNum && ctcMaxNum
      ? `₹${ctcMinNum}–${ctcMaxNum} LPA`
      : ctcMinNum
        ? `₹${ctcMinNum}+ LPA`
        : 'Competitive';

    await db.insert(jobTable).values({
      id,
      title: String(title).trim(),
      company: companyName,
      postedByUserId: session.user.id,
      department: typeof department === 'string' ? department.trim() : '',
      location: String(location).trim(),
      locationType: typeof locationType === 'string' ? locationType : 'onsite',
      ctcMin: ctcMinNum,
      ctcMax: ctcMaxNum,
      ctcLabel,
      experience: typeof experience === 'string' ? experience.trim() : `${expYears}+ years`,
      experienceYears: expYears,
      category: typeof category === 'string' ? category.trim() : 'other',
      skills: skillsArr,
      description: typeof description === 'string' ? description.trim() : '',
      responsibilities: responsibilitiesArr,
      requirements: requirementsArr,
      interviewRounds: roundsArr.length > 0 ? roundsArr : undefined,
      postedDays: 0,
      status: 'active',
      applicants: 0,
      feePercent: feeNum,
      paymentTermDays: paymentTermDaysNum,
      visibility,
    });

    logAudit({
      entityType: 'job',
      entityId: id,
      action: 'job.created',
      actorUserId: session.user.id,
      actorRole: role,
      metadata: { title: String(title).trim(), visibility, jobCode },
    });

    res.status(201).json({ id, jobCode, message: 'Job posted successfully' });

    // Fire-and-forget: notify matching subscribers after responding
    const newJob: Job = {
      id,
      title: String(title).trim(),
      company: companyName,
      department: typeof department === 'string' ? department.trim() : '',
      location: String(location).trim(),
      locationType: (typeof locationType === 'string' ? locationType : 'onsite') as Job['locationType'],
      ctcMin: ctcMinNum,
      ctcMax: ctcMaxNum,
      ctcLabel,
      experience: typeof experience === 'string' ? experience.trim() : `${expYears}+ years`,
      experienceYears: expYears,
      category: typeof category === 'string' ? category.trim() : 'other',
      skills: skillsArr,
      description: typeof description === 'string' ? description.trim() : '',
      responsibilities: responsibilitiesArr,
      requirements: requirementsArr,
      postedDays: 0,
      status: 'active',
      applicants: 0,
      feePercent: feeNum,
    };
    // Don't blast consultant-only/confidential roles out to general public
    // job-alert subscribers — that would defeat the purpose of restricting them.
    if (visibility === 'public') {
      notifyMatchingSubscribers(newJob).catch(err =>
        console.error('[POST /api/jobs] alert notification failed:', err),
      );
    }

    // Send job posted confirmation email to employer (SOP §24)
    try {
      const [employerUser] = await db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);

      if (employerUser) {
        sendEmail({
          to: employerUser.email,
          subject: `Your job "${String(title).trim()}" is now live on TRICCI`,
          html: buildJobPostedEmail(employerUser.name, String(title).trim(), jobCode, `${BASE}/employer/dashboard`),
          text: `Hi ${employerUser.name},\n\nYour job "${String(title).trim()}" (${jobCode}) has been posted and is now live.\n\nView your dashboard: ${BASE}/employer/dashboard\n\n— The TRICCI Team`,
        }).catch(e => console.error('[POST /api/jobs] employer email failed:', e));
      }
    } catch (emailErr) {
      console.error('[POST /api/jobs] email dispatch error:', emailErr);
    }
  } catch (err) {
    console.error('[POST /api/jobs] error:', err);
    res.status(500).json({ error: 'Failed to post job' });
  }
}
