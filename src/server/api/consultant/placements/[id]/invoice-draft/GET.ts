/**
 * GET /api/consultant/placements/:id/invoice-draft
 * The consultant's invoice for a placement: the saved draft or submitted invoice,
 * plus a live preview of the amounts from the employer's offered CTC.
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

    const ctx = await loadInvoiceContext(placementId, session.user.id);
    if (!ctx) return res.status(404).json({ error: 'Placement not found' });

    const [invoice] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);

    const share = await consultantSharePctFor(session.user.id);
    const preview = ctx.offerCtcLpa != null
      ? computeInvoiceAmounts({
          fee: ctx.fee,
          offerCtcLpa: ctx.offerCtcLpa,
          consultantSharePct: share,
          gstEnabled: invoice?.gstEnabled ?? false,
          gstRatePct: DEFAULT_GST_RATE_PCT,
        })
      : null;

    res.json({
      placement: {
        id: ctx.placementId,
        candidateName: ctx.candidateName,
        jobTitle: ctx.jobTitle,
        companyName: ctx.companyName,
        offerCtcLpa: ctx.offerCtcLpa,
      },
      ctcOffered: ctx.offerCtcLpa != null,
      invoice: invoice ?? null,
      preview,
      gstRatePct: DEFAULT_GST_RATE_PCT,
    });
  } catch (err) {
    console.error('[consultant.invoice-draft.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to load invoice' });
  }
}
