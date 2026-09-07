/**
 * GET /api/admin/submissions
 * Admin-only. Returns all consultant submissions with candidate + job data.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, job, user } from '@/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, search } = req.query as { status?: string; search?: string };

    // Join submission → job, consultant user
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
        // Job info
        jobId: job.id,
        jobTitle: job.title,
        jobCompany: job.company,
        jobLocation: job.location,
        jobFeePercent: job.feePercent,
        jobCtcLabel: job.ctcLabel,
        // Consultant info
        consultantId: user.id,
        consultantName: user.name,
        consultantEmail: user.email,
      })
      .from(submission)
      .leftJoin(job, eq(submission.jobId, job.id))
      .leftJoin(user, eq(submission.consultantUserId, user.id))
      .orderBy(desc(submission.createdAt))
      .limit(500);

    let filtered = rows;
    if (status && status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.candidateName.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q) ||
        (r.jobTitle ?? '').toLowerCase().includes(q) ||
        (r.consultantName ?? '').toLowerCase().includes(q),
      );
    }

    res.json({ submissions: filtered, total: filtered.length });
  } catch (err) {
    console.error('admin.submissions.get.error', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}
