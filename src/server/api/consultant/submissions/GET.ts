/**
 * GET /api/consultant/submissions
 * Returns all submissions made by the authenticated consultant.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, job } from '@/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') {
      return res.status(403).json({ error: 'Consultant access required' });
    }

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
      })
      .from(submission)
      .leftJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.consultantUserId, session.user.id))
      .orderBy(desc(submission.createdAt))
      .limit(200);

    res.json({ submissions: rows, total: rows.length });
  } catch (err) {
    console.error('consultant.submissions.get.error', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}
