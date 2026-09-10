/**
 * PUT /api/admin/jobs/:id
 * Admin-only. Edit job fee %, status, or company name.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { job } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { feePercent, status, company } = req.body as {
      feePercent?: number;
      status?: string;
      company?: string;
    };

    const updates: Partial<typeof job.$inferInsert> = {};
    if (feePercent !== undefined) updates.feePercent = Number(feePercent);
    if (status !== undefined) updates.status = String(status);
    if (company !== undefined) updates.company = String(company).trim();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await db.update(job).set(updates).where(eq(job.id, String(id)));
    const [updated] = await db.select().from(job).where(eq(job.id, String(id)));
    if (!updated) return res.status(404).json({ error: 'Job not found' });

    res.json({ job: updated });
  } catch (err) {
    console.error('admin.jobs.put.error', err);
    res.status(500).json({ error: 'Failed to update job' });
  }
}
