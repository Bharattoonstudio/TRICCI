/**
 * POST /api/consultant/placements/:id/invoice-draft/generate
 * Generates or regenerates the consultant's draft invoice from the employer's
 * offered CTC. Used for both the first generate and any edit before submission.
 * Body: { gstEnabled: boolean }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { loadInvoiceContext } from '@/server/lib/consultantInvoiceLoad.js';
import { computeInvoiceAmounts, DEFAULT_GST_RATE_PCT } from '@/server/lib/consultantInvoice.js';
import { consultantSharePctFor } from '@/server/lib/consultantPlan.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant') return res.status(403).json({ error: 'Consultant access required' });

    const placementId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const gstEnabled = (req.body as { gstEnabled?: unknown })?.gstEnabled;
    if (typeof gstEnabled !== 'boolean') return res.status(400).json({ error: 'gstEnabled must be true or false' });

    const ctx = await loadInvoiceContext(placementId, session.user.id);
    if (!ctx) return res.status(404).json({ error: 'Placement not found' });
    if (ctx.offerCtcLpa == null) {
      return res.status(409).json({ error: 'The employer has not entered the CTC offered yet.' });
    }

    const [existing] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);
    if (existing?.status === 'submitted') {
      return res.status(409).json({ error: 'This invoice has been submitted and can no longer be edited.' });
    }

    const share = await consultantSharePctFor(session.user.id);
    const amounts = computeInvoiceAmounts({
      fee: ctx.fee,
      offerCtcLpa: ctx.offerCtcLpa,
      consultantSharePct: share,
      gstEnabled,
      gstRatePct: DEFAULT_GST_RATE_PCT,
    });

    const values = {
      gstEnabled,
      gstRatePct: DEFAULT_GST_RATE_PCT,
      offerCtcLpa: ctx.offerCtcLpa,
      feeAmountLpa: amounts.feeAmountLpa,
      platformAmountLpa: amounts.platformAmountLpa,
      consultantAmountLpa: amounts.consultantAmountLpa,
      gstAmountLpa: amounts.gstAmountLpa,
      totalAmountLpa: amounts.totalAmountLpa,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(consultantInvoice).set(values).where(eq(consultantInvoice.placementId, placementId));
    } else {
      await db.insert(consultantInvoice).values({
        placementId,
        consultantUserId: session.user.id,
        status: 'draft',
        ...values,
      });
    }

    const [invoice] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);
    res.json({ ok: true, invoice });
  } catch (err) {
    console.error('[consultant.invoice-draft.generate] ERROR:', err);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
}
