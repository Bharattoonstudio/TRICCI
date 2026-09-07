/**
 * POST /api/employer/scorecards
 * Submit a panel scorecard for a candidate.
 *
 * Body: {
 *   submissionId?: number,
 *   candidateName: string,
 *   candidateEmail: string,
 *   jobTitle: string,
 *   jobId?: string,
 *   technicalScore: number,      // 0–100
 *   communicationScore: number,
 *   cultureFitScore: number,
 *   leadershipScore: number,
 *   recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no',
 *   notes?: string,
 *   submittedBy?: string,
 * }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { scorecard } from '@/server/db/schema.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

const VALID_RECOMMENDATIONS = ['strong_yes', 'yes', 'maybe', 'no'] as const;
type Recommendation = typeof VALID_RECOMMENDATIONS[number];

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
      technicalScore = 0,
      communicationScore = 0,
      cultureFitScore = 0,
      leadershipScore = 0,
      recommendation = 'maybe',
      notes,
      submittedBy,
    } = req.body as {
      submissionId?: number;
      candidateName: string;
      candidateEmail: string;
      jobTitle: string;
      jobId?: string;
      technicalScore?: number;
      communicationScore?: number;
      cultureFitScore?: number;
      leadershipScore?: number;
      recommendation?: string;
      notes?: string;
      submittedBy?: string;
    };

    if (!candidateName || !candidateEmail || !jobTitle) {
      return res.status(400).json({ error: 'candidateName, candidateEmail, and jobTitle are required' });
    }
    if (!VALID_RECOMMENDATIONS.includes(recommendation as Recommendation)) {
      return res.status(400).json({ error: `recommendation must be one of: ${VALID_RECOMMENDATIONS.join(', ')}` });
    }

    // Compute overall as weighted average: technical 40%, communication 25%, culture 20%, leadership 15%
    const overallScore = Math.round(
      technicalScore * 0.4 +
      communicationScore * 0.25 +
      cultureFitScore * 0.2 +
      leadershipScore * 0.15
    );

    const [result] = await db.insert(scorecard).values({
      submissionId: submissionId ?? null,
      candidateName,
      candidateEmail,
      jobTitle,
      jobId: jobId ?? null,
      postedByUserId: session.user.id,
      technicalScore,
      communicationScore,
      cultureFitScore,
      leadershipScore,
      overallScore,
      recommendation,
      notes: notes ?? null,
      submittedBy: submittedBy ?? null,
    });

    res.status(201).json({ ok: true, id: (result as { insertId: number }).insertId, overallScore });
  } catch (err) {
    console.error('employer.scorecards.post.error', err);
    res.status(500).json({ error: 'Failed to submit scorecard' });
  }
}
