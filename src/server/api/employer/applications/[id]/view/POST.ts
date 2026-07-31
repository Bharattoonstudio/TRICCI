/**
 * POST /api/employer/applications/:id/view
 * Marks a direct candidate application as viewed (feeds the "Seen" stage of
 * the funnel dashboard, point 13). Fire-and-forget from the frontend when
 * the CV viewer opens — only sets viewedAt the first time.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateApplication, job } from '@/server/db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid application ID' });

    // Scope to employer's own job unless admin
    const [row] = await db
      .select({ appId: candidateApplication.id, postedByUserId: job.postedByUserId })
      .from(candidateApplication)
      .innerJoin(job, eq(candidateApplication.jobId, job.id))
      .where(eq(candidateApplication.id, id))
      .limit(1);

    if (!row) return res.status(404).json({ error: 'Application not found' });
    if (role === 'employer' && row.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your job posting' });
    }

    await db
      .update(candidateApplication)
      .set({ viewedAt: new Date() })
      .where(and(eq(candidateApplication.id, id), isNull(candidateApplication.viewedAt)));

    res.json({ ok: true });
  } catch (err) {
    console.error('[employer.applications.view] ERROR:', err);
    res.status(500).json({ error: 'Failed to mark as viewed' });
  }
}
