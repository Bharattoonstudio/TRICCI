// NEW FILE: src/server/api/employer/jobs/[id]/status/PUT.ts
// Lets the employer pause/close/reopen their own job, and set priority
// (1 = Normal, 2 = Urgent, 3 = Very Urgent / Burning)
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { job as jobTable } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

const VALID_STATUSES = ['active', 'paused', 'closed'];

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers }).catch(() => null);
    if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const role = (session.user as { role?: string })?.role;
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const jobId = req.params.id;
    const { status, priority } = req.body as { status?: string; priority?: number };

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (priority !== undefined && ![1, 2, 3].includes(priority)) {
      return res.status(400).json({ error: 'priority must be 1 (Normal), 2 (Urgent), or 3 (Burning)' });
    }
    if (!status && priority === undefined) {
      return res.status(400).json({ error: 'Provide status and/or priority to update' });
    }

    // Confirm this job belongs to the requesting employer (admins can edit any job)
    const [existing] = await db.select().from(jobTable).where(eq(jobTable.id, jobId)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Job not found' });
    if (role === 'employer' && existing.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'You can only edit your own jobs' });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (priority !== undefined) updates.priority = priority;

    await db.update(jobTable)
      .set(updates)
      .where(eq(jobTable.id, jobId));

    res.json({ message: 'Job updated successfully', status: status || existing.status, priority: priority ?? existing.priority });
  } catch (err) {
    console.error('[PUT /api/employer/jobs/:id/status] Error:', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
}
