/**
 * GET /api/candidate/applications
 * Returns all job applications made by the logged-in candidate.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateApplication, job } from '@/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const applications = await db
      .select({
        id: candidateApplication.id,
        status: candidateApplication.status,
        coverNote: candidateApplication.coverNote,
        appliedAt: candidateApplication.createdAt,
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        location: job.location,
        locationType: job.locationType,
        ctcLabel: job.ctcLabel,
        experience: job.experience,
        department: job.department,
        jobStatus: job.status,
      })
      .from(candidateApplication)
      .innerJoin(job, eq(candidateApplication.jobId, job.id))
      .where(eq(candidateApplication.candidateUserId, session.user.id))
      .orderBy(desc(candidateApplication.createdAt));

    res.json({ applications });
  } catch (err) {
    console.error('candidate.applications.get.error', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
}
