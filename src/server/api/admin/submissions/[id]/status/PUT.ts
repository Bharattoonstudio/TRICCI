/**
 * PUT /api/admin/submissions/:id/status
 * Admin-only. Update submission status (pending | shortlisted | rejected | placed).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

const VALID_STATUSES = ['pending', 'shortlisted', 'rejected', 'placed'];

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, rejectionReason } = req.body as { status?: string; rejectionReason?: string };

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (status === 'rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({ error: 'rejection_reason_required', message: 'Please provide a reason for rejecting this candidate' });
    }

    await db.update(submission).set({ status, ...(status === 'rejected' ? { rejectionReason: rejectionReason!.trim() } : {}) }).where(eq(submission.id, Number(id)));
    res.json({ ok: true, status });
  } catch (err) {
    console.error('admin.submissions.status.put.error', err);
    res.status(500).json({ error: 'Failed to update submission status' });
  }
}
