/**
 * GET /api/employer/export/candidates
 * Excel/CSV export of every candidate (direct applications + consultant
 * submissions) across the employer's jobs, with full fields. CSV opens
 * natively in Excel — no extra library/build risk needed for this.
 * Optional ?jobId= to scope to a single job.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateApplication, submission, job, user } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const jobIdFilter = req.query.jobId ? String(req.query.jobId) : undefined;

    const appConditions = role === 'employer'
      ? and(eq(job.postedByUserId, session.user.id), ...(jobIdFilter ? [eq(candidateApplication.jobId, jobIdFilter)] : []))
      : jobIdFilter ? eq(candidateApplication.jobId, jobIdFilter) : undefined;

    const apps = await db
      .select({
        jobTitle: job.title,
        candidateName: user.name,
        candidateEmail: user.email,
        status: candidateApplication.status,
        ctcFixed: candidateApplication.ctcFixed,
        noticePeriodDays: candidateApplication.noticePeriodDays,
        cvMatchScore: candidateApplication.cvMatchScore,
        createdAt: candidateApplication.createdAt,
        rejectionReason: candidateApplication.rejectionReason,
      })
      .from(candidateApplication)
      .innerJoin(job, eq(candidateApplication.jobId, job.id))
      .innerJoin(user, eq(candidateApplication.candidateUserId, user.id))
      .where(appConditions);

    const subConditions = role === 'employer'
      ? and(eq(job.postedByUserId, session.user.id), ...(jobIdFilter ? [eq(submission.jobId, jobIdFilter)] : []))
      : jobIdFilter ? eq(submission.jobId, jobIdFilter) : undefined;

    const subs = await db
      .select({
        jobTitle: job.title,
        candidateName: submission.candidateName,
        candidateEmail: submission.candidateEmail,
        candidatePhone: submission.candidatePhone,
        status: submission.status,
        consultantName: user.name,
        createdAt: submission.createdAt,
        rejectionReason: submission.rejectionReason,
      })
      .from(submission)
      .innerJoin(job, eq(submission.jobId, job.id))
      .innerJoin(user, eq(submission.consultantUserId, user.id))
      .where(subConditions);

    const headers = ['Source', 'Job Title', 'Candidate Name', 'Email', 'Phone', 'Status', 'Consultant', 'CTC Fixed (₹)', 'Notice Period (days)', 'CV Match %', 'Applied/Submitted On', 'Rejection Reason'];
    const rows: string[][] = [];

    for (const a of apps) {
      rows.push([
        'Direct', a.jobTitle, a.candidateName ?? '', a.candidateEmail ?? '', '',
        a.status, '', a.ctcFixed != null ? String(a.ctcFixed) : '',
        a.noticePeriodDays != null ? String(a.noticePeriodDays) : '',
        a.cvMatchScore != null ? String(a.cvMatchScore) : '',
        a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : '',
        a.rejectionReason ?? '',
      ]);
    }
    for (const s of subs) {
      rows.push([
        'Consultant', s.jobTitle, s.candidateName, s.candidateEmail ?? '', s.candidatePhone ?? '',
        s.status, s.consultantName ?? '', '', '', '',
        s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : '',
        s.rejectionReason ?? '',
      ]);
    }

    const csv = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="tricci-candidates-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel to correctly detect UTF-8
  } catch (err) {
    console.error('[employer.export.candidates] ERROR:', err);
    res.status(500).json({ error: 'Failed to export candidates' });
  }
}
