/**
 * GET /api/admin/jobs/:id
 * Admin only. Full details of one job, its poster, and its pipeline
 * (direct applications and consultant submissions). Read-only.
 */
import type { Request, Response } from 'express';
import { desc, eq, inArray } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { db } from '@/server/db/client.js';
import { job, user, candidateApplication, submission } from '@/server/db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if ((session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const jobId = String(req.params.id);
    const [row] = await db
      .select({
        job: job,
        posterName: user.name,
        posterEmail: user.email,
      })
      .from(job)
      .leftJoin(user, eq(job.postedByUserId, user.id))
      .where(eq(job.id, jobId))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'Job not found' });

    const applications = await db
      .select({
        id: candidateApplication.id,
        candidateName: user.name,
        candidateEmail: user.email,
        status: candidateApplication.status,
        createdAt: candidateApplication.createdAt,
      })
      .from(candidateApplication)
      .leftJoin(user, eq(candidateApplication.candidateUserId, user.id))
      .where(eq(candidateApplication.jobId, jobId))
      .orderBy(desc(candidateApplication.createdAt))
      .limit(200);

    const submissions = await db
      .select({
        id: submission.id,
        candidateName: submission.candidateName,
        candidateEmail: submission.candidateEmail,
        status: submission.status,
        consultantUserId: submission.consultantUserId,
        createdAt: submission.createdAt,
      })
      .from(submission)
      .where(eq(submission.jobId, jobId))
      .orderBy(desc(submission.createdAt))
      .limit(200);

    const consultantIds = [...new Set(submissions.map(s => s.consultantUserId).filter(Boolean))] as string[];
    const consultantRows = consultantIds.length
      ? await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(inArray(user.id, consultantIds))
      : [];
    const consultantById = new Map(consultantRows.map(c => [c.id, c]));
    const submissionsWithConsultant = submissions.map(s => ({
      ...s,
      consultantName: consultantById.get(s.consultantUserId)?.name ?? null,
      consultantEmail: consultantById.get(s.consultantUserId)?.email ?? null,
    }));

    return res.status(200).json({
      job: row.job,
      poster: { name: row.posterName, email: row.posterEmail },
      applications,
      submissions: submissionsWithConsultant,
    });
  } catch (error) {
    console.error('[admin/jobs/:id] error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not load job' });
  }
}
