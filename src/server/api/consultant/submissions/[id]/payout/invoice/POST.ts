/**
 * POST /api/consultant/submissions/:id/payout/invoice
 * Consultant submits the invoice for a successful placement. The invoice must
 * be submitted by the end of day 90 (counted from the candidate's joining date).
 * Payout is released on day 92, after the employer has paid and an invoice is on file.
 *
 * Body: { invoiceNumber: string }
 * Returns: { ok, status, invoiceDeadlineAt, releaseDueAt, canRelease }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, consultantPayout } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { decidePayoutRelease } from '@/server/lib/payoutRelease.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant') return res.status(403).json({ error: 'Consultant access required' });

    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid submission id' });

    const invoiceNumber = typeof req.body?.invoiceNumber === 'string' ? req.body.invoiceNumber.trim() : '';
    if (!invoiceNumber || invoiceNumber.length > 64) {
      return res.status(400).json({ error: 'invoiceNumber is required (max 64 characters).' });
    }

    const [row] = await db
      .select({
        id: submission.id,
        consultantUserId: submission.consultantUserId,
        joiningDate: submission.joiningDate,
      })
      .from(submission)
      .where(eq(submission.id, id))
      .limit(1);

    if (!row || row.consultantUserId !== session.user.id) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const now = new Date();
    const [existing] = await db
      .select()
      .from(consultantPayout)
      .where(eq(consultantPayout.submissionId, id))
      .limit(1);

    const invoiceSubmittedAt = existing?.invoiceSubmittedAt ?? now;
    const updated = {
      invoiceNumber,
      invoiceSubmittedAt,
      joiningDate: row.joiningDate ?? existing?.joiningDate ?? null,
      updatedAt: now,
    };

    if (existing) {
      await db.update(consultantPayout).set(updated).where(eq(consultantPayout.submissionId, id));
    } else {
      await db.insert(consultantPayout).values({
        submissionId: id,
        consultantUserId: row.consultantUserId,
        employerPaidAt: null,
        adminHold: false,
        refundedAt: null,
        ...updated,
      });
    }

    const decision = decidePayoutRelease({
      joiningDate: updated.joiningDate,
      employerPaidAt: existing?.employerPaidAt ?? null,
      invoiceSubmittedAt,
      adminHold: existing?.adminHold ?? false,
      refundedAt: existing?.refundedAt ?? null,
    }, now);

    res.json({
      ok: true,
      status: decision.status,
      invoiceDeadlineAt: decision.invoiceDeadlineAt,
      releaseDueAt: decision.releaseDueAt,
      canRelease: decision.canRelease,
    });
  } catch (err) {
    console.error('[payout.invoice] error:', err);
    res.status(500).json({ error: 'Failed to submit invoice. Please try again.' });
  }
}
