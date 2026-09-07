/**
 * GET /api/employer/applications
 * Returns all direct candidate applications for jobs posted by the authenticated employer.
 * Contact details are masked per SOP CV Masking Engine.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateApplication, job, user, candidateProfile } from '@/server/db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
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
    if (jobId) conditions.push(eq(candidateApplication.jobId, jobId));
    if (status && status !== 'all') conditions.push(eq(candidateApplication.status, status));

    const rows = await db
      .select({
        id: candidateApplication.id,
        status: candidateApplication.status,
        coverNote: candidateApplication.coverNote,
        appliedAt: candidateApplication.createdAt,
        // Job info
        jobId: job.id,
        jobTitle: job.title,
        jobLocation: job.location,
        jobCtcLabel: job.ctcLabel,
        // Candidate info
        candidateUserId: user.id,
        candidateName: user.name,
        candidateEmail: user.email,
        candidatePhone: candidateProfile.phone,
        candidateTitle: candidateProfile.currentTitle,
        // Prefer the AI-enhanced, JD-tailored CV the candidate approved for
        // THIS application (if any), otherwise fall back to their profile CV.
        candidateCvUrl: sql<string | null>`COALESCE(${candidateApplication.cvUrl}, ${candidateProfile.cvUrl})`,
        candidateCvFileName: sql<string | null>`COALESCE(${candidateApplication.cvFileName}, ${candidateProfile.cvFileName})`,
        cvMatchScore: candidateApplication.cvMatchScore,
        candidateSkills: candidateProfile.skills,
        candidateExperience: candidateProfile.totalExperience,
      })
      .from(candidateApplication)
      .innerJoin(job, eq(candidateApplication.jobId, job.id))
      .innerJoin(user, eq(candidateApplication.candidateUserId, user.id))
      .leftJoin(candidateProfile, eq(candidateProfile.userId, user.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(candidateApplication.createdAt))
      .limit(500);

    // Mask contact details per SOP CV Masking Engine
    const masked = rows.map(r => ({
      ...r,
      candidateEmail: r.candidateEmail ? maskEmail(r.candidateEmail) : null,
      candidatePhone: r.candidatePhone ? maskPhone(r.candidatePhone) : null,
    }));

    res.json({ applications: masked, total: masked.length });
  } catch (err) {
    console.error('employer.applications.get.error', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
}
