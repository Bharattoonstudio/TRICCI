/**
 * POST /api/consultant/jobs/:id/accept
 * Records the consultant's acceptance of a job's terms (spec STEP 5:
 * replacement period, fee %, no duplicate submission, no fake profiles,
 * no resume farming, no candidate consent violation). Required before
 * the consultant can submit candidates to this job — enforced in
 * /api/submissions POST.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { job, jobAcceptance } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { hasSignedAgreement } from '@/server/lib/requireAgreement.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    if (role === 'consultant' && !(await hasSignedAgreement(session.user.id, 'consultant'))) {
      return res.status(403).json({ error: 'agreement_required', message: 'Please accept the TRICCI agreement before accepting jobs' });
    }

    const jobId = String(req.params.id);
    const [jobRow] = await db.select({ id: job.id }).from(job).where(eq(job.id, jobId)).limit(1);
    if (!jobRow) return res.status(404).json({ error: 'Job not found' });

    const [existing] = await db
      .select({ id: jobAcceptance.id })
      .from(jobAcceptance)
      .where(and(eq(jobAcceptance.jobId, jobId), eq(jobAcceptance.consultantUserId, session.user.id)))
      .limit(1);

    if (!existing) {
      await db.insert(jobAcceptance).values({ jobId, consultantUserId: session.user.id });
    }

    res.json({ ok: true, accepted: true });
  } catch (err) {
    console.error('[consultant.jobs.accept] ERROR:', err);
    res.status(500).json({ error: 'Failed to accept job' });
  }
}
