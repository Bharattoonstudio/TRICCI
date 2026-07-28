/**
 * POST /api/employer/assessments
 * Create a new assessment record for a candidate in the ATS pipeline.
 *
 * Body: {
 *   submissionId?: number,
 *   candidateName: string,
 *   candidateEmail: string,
 *   jobTitle: string,
 *   jobId?: string,
 *   type: string,
 *   score?: number,
 *   maxScore?: number,
 *   status?: 'pending' | 'completed' | 'expired',
 *   completedAt?: string,   // ISO date string
 *   notes?: string,
 * }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { assessment } from '@/server/db/schema.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Employer access required' });
    }

    const {
      submissionId,
      candidateName,
      candidateEmail,
      jobTitle,
      jobId,
      type = 'Technical',
      score = 0,
      maxScore = 100,
      status = 'pending',
      completedAt,
      notes,
    } = req.body as {
      submissionId?: number;
      candidateName: string;
      candidateEmail: string;
      jobTitle: string;
      jobId?: string;
      type?: string;
      score?: number;
      maxScore?: number;
      status?: string;
      completedAt?: string;
      notes?: string;
    };

    if (!candidateName || !candidateEmail || !jobTitle) {
      return res.status(400).json({ error: 'candidateName, candidateEmail, and jobTitle are required' });
    }

    const [result] = await db.insert(assessment).values({
      submissionId: submissionId ?? null,
      candidateName,
      candidateEmail,
      jobTitle,
      jobId: jobId ?? null,
      postedByUserId: session.user.id,
      type,
      score,
      maxScore,
      status,
      completedAt: completedAt ? new Date(completedAt) : null,
      notes: notes ?? null,
    });

    res.status(201).json({ ok: true, id: (result as { insertId: number }).insertId });
  } catch (err) {
    console.error('employer.assessments.post.error', err);
    res.status(500).json({ error: 'Failed to create assessment' });
  }
}
