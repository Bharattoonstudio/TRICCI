/**
 * GET /api/employer/assessments
 * Returns all assessments for jobs posted by the authenticated employer.
 * Optional query: ?submissionId=123
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { assessment } from '@/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
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

    const { submissionId } = req.query as { submissionId?: string };

    const conditions = [];
    if (role === 'employer') {
      conditions.push(eq(assessment.postedByUserId, session.user.id));
    }
    if (submissionId) {
      conditions.push(eq(assessment.submissionId, parseInt(submissionId, 10)));
    }

    const rows = await db
      .select()
      .from(assessment)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(assessment.createdAt))
      .limit(500);

    res.json({ assessments: rows, total: rows.length });
  } catch (err) {
    console.error('employer.assessments.get.error', err);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
}
