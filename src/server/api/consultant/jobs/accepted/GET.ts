/**
 * GET /api/consultant/jobs/accepted
 * Returns the list of jobs this consultant has accepted — job IDs for
 * backwards compatibility with existing callers, plus title/company so
 * the CV Bank bulk-submit flow can show a real picker instead of just IDs.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { jobAcceptance, job } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const rows = await db
      .select({ jobId: jobAcceptance.jobId, title: job.title, company: job.company })
      .from(jobAcceptance)
      .innerJoin(job, eq(jobAcceptance.jobId, job.id))
      .where(eq(jobAcceptance.consultantUserId, session.user.id));

    res.json({ jobIds: rows.map(r => r.jobId), jobs: rows.map(r => ({ id: r.jobId, title: r.title, company: r.company })) });
  } catch (err) {
    console.error('[consultant.jobs.accepted] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch accepted jobs' });
  }
}

