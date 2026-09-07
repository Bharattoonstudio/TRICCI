/**
 * GET /api/employer/submissions
 * Returns all consultant submissions for jobs posted by the authenticated employer.
 * Contact details are masked per SOP CV Masking Engine.
 * Optional query params: jobId, status
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, job, user } from '@/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
}
function maskPhone(phone: string): string {
  return phone.replace(/(\d{2})\d+(\d{2})/, '$1******$2');
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Employer access required' });
    }

    const { jobId, status } = req.query as { jobId?: string; status?: string };

    const conditions = [];
    if (role === 'employer') {
      conditions.push(eq(job.postedByUserId, session.user.id));
    }
    if (jobId) conditions.push(eq(submission.jobId, jobId));
    if (status && status !== 'all') conditions.push(eq(submission.status, status));

    const rows = await db
      .select({
        id: submission.id,
        status: submission.status,
        candidateName: submission.candidateName,
        candidateEmail: submission.candidateEmail,
        candidatePhone: submission.candidatePhone,
        cvUrl: submission.cvUrl,
        coverNote: submission.coverNote,
        createdAt: submission.createdAt,
        jobId: job.id,
        jobTitle: job.title,
        jobCompany: job.company,
        jobLocation: job.location,
        jobCtcLabel: job.ctcLabel,
        jobFeePercent: job.feePercent,
        consultantId: user.id,
        consultantName: user.name,
        consultantEmail: user.email,
      })
      .from(submission)
      .leftJoin(job, eq(submission.jobId, job.id))
      .leftJoin(user, eq(submission.consultantUserId, user.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(submission.createdAt))
      .limit(500);

    // Mask candidate contact details per SOP CV Masking Engine
    const masked = rows.map(r => ({
      ...r,
      candidateEmail: r.candidateEmail ? maskEmail(r.candidateEmail) : null,
      candidatePhone: r.candidatePhone ? maskPhone(r.candidatePhone) : null,
    }));

    res.json({ submissions: masked, total: masked.length });
  } catch (err) {
    console.error('employer.submissions.get.error', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}
