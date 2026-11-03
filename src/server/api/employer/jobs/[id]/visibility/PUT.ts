// PUT /api/employer/jobs/:id/visibility
// Lets the employer who posted a job (or an admin) change who can see it.
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { job as jobTable } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { isReadOnlyOrgViewer } from '@/server/lib/orgPermissions.js';

const VALID_VISIBILITY = ['public', 'consultant_only', 'confidential', 'candidates_only'] as const;

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers }).catch(() => null);
    if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const role = (session.user as { role?: string })?.role;
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (role === 'employer' && await isReadOnlyOrgViewer(session.user.id)) {
      return res.status(403).json({ error: 'read_only', message: 'Viewer accounts have read-only access' });
    }

    const { visibility } = req.body as { visibility?: string };
    if (!visibility || !(VALID_VISIBILITY as readonly string[]).includes(visibility)) {
      return res.status(400).json({ error: `visibility must be one of: ${VALID_VISIBILITY.join(', ')}` });
    }

    const jobId = String(req.params.id);
    const [existing] = await db.select({ id: jobTable.id, postedByUserId: jobTable.postedByUserId })
      .from(jobTable).where(eq(jobTable.id, jobId)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Job not found' });
    if (role === 'employer' && existing.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'You can only edit your own jobs' });
    }

    await db.update(jobTable).set({ visibility }).where(eq(jobTable.id, jobId));
    res.json({ ok: true, visibility });
  } catch (err) {
    console.error('[PUT /api/employer/jobs/:id/visibility] Error:', err);
    res.status(500).json({ error: 'Failed to update visibility' });
  }
}
