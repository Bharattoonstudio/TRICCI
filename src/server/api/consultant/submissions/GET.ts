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
        candidateLocation: submission.candidateLocation,
        candidateExperienceYears: submission.candidateExperienceYears,
        candidateExpectedCtcLpa: submission.candidateExpectedCtcLpa,
        candidateCurrentCtcLpa: submission.candidateCurrentCtcLpa,
        cvUrl: submission.cvUrl,
        coverNote: submission.coverNote,
        duplicateFlag: submission.duplicateFlag,
        winningConsultantId: submission.winningConsultantId,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        jobId: job.id,
        jobTitle: job.title,
        jobCompany: job.company,
      })
      .from(submission)
      .leftJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.consultantUserId, session.user.id))
      .orderBy(desc(submission.createdAt))
      .limit(200);

    res.json({
      ok: true,
      submissions: rows.map(row => ({
        id: row.id,
        status: row.status,
        candidateName: row.candidateName,
        candidateEmail: row.candidateEmail,
        candidatePhone: row.candidatePhone,
        candidateLocation: row.candidateLocation,
        experience: row.candidateExperienceYears,
        ctcExpected: row.candidateExpectedCtcLpa,
        ctcCurrent: row.candidateCurrentCtcLpa,
        cvUrl: row.cvUrl,
        coverNote: row.coverNote,
        // P0 #1: Show duplicate status
        isDuplicate: row.duplicateFlag === 'duplicate',
        isWinner: row.duplicateFlag !== 'duplicate',
        message: row.duplicateFlag === 'duplicate' 
          ? '⚠️ Another consultant submitted this candidate first' 
          : '✅ You are the primary consultant for this submission',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        jobId: row.jobId,
        jobTitle: row.jobTitle,
        jobCompany: row.jobCompany,
      })),
      total: rows.length,
    });
  } catch (err) {
    console.error('consultant.submissions.get.error', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
}
