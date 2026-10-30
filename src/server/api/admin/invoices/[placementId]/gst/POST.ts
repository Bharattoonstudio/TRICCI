/**
 * POST /api/admin/invoices/:placementId/gst
 * Admin turns GST collection from the employer on or off. GST = placement fee × rate.
 * Body: { gstEnabled: boolean }. Allowed until the invoice has gone to the employer.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/server/lib/adminAuth.js';
import { canEditGst } from '@/server/lib/invoiceStatus.js';
import { gstForFee } from '@/server/lib/invoiceGst.js';

export default async function handler(req: Request, res: Response) {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const placementId = parseInt(String(req.params.placementId), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const gstEnabled = req.body?.gstEnabled;
    if (typeof gstEnabled !== 'boolean') return res.status(400).json({ error: 'gstEnabled must be true or false' });

    const [invoice] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (!canEditGst(invoice.status as never)) {
      return res.status(409).json({ error: 'GST can only be changed before the invoice goes to the employer.' });
    }

    const amounts = gstForFee(invoice.feeAmountLpa, invoice.gstRatePct, gstEnabled);
    const now = new Date();
    await db.update(consultantInvoice).set({
      gstEnabled,
      gstAmountLpa: amounts.gstAmountLpa,
      totalAmountLpa: amounts.totalAmountLpa,
      updatedAt: now,
    }).where(eq(consultantInvoice.placementId, placementId));

    res.json({ ok: true, gstEnabled, gstAmountLpa: amounts.gstAmountLpa, totalAmountLpa: amounts.totalAmountLpa });
  } catch (err) {
    console.error('[admin.invoices.gst] ERROR:', err);
    res.status(500).json({ error: 'Failed to update GST' });
  }
}
