/** POST /api/admin/invoices/:placementId/send-back — returns the invoice to the consultant with remarks. Body: { remarks } */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/server/lib/adminAuth.js';
import { loadInvoiceWithPlacement, notifyUser } from '@/server/lib/invoiceReview.js';
import { canSendBack } from '@/server/lib/invoiceStatus.js';

export default async function handler(req: Request, res: Response) {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const placementId = parseInt(String(req.params.placementId), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const remarks = typeof req.body?.remarks === 'string' ? req.body.remarks.trim() : '';
    if (!remarks) return res.status(400).json({ error: 'Remarks are required when sending an invoice back.' });

    const { invoice, placement: plc } = await loadInvoiceWithPlacement(placementId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (!canSendBack(invoice.status)) {
      return res.status(409).json({ error: 'Only a submitted or approved invoice can be sent back.' });
    }

    const now = new Date();
    await db.update(consultantInvoice).set({
      status: 'sent_back', adminRemarks: remarks, reviewedAt: now, reviewedByUserId: adminId, approvedAt: null, updatedAt: now,
    }).where(eq(consultantInvoice.placementId, placementId));

    await notifyUser(invoice.consultantUserId, 'invoice_sent_back',
      `Your invoice for ${plc?.candidateName ?? 'a placement'} needs changes: ${remarks}`,
      '/consultant/dashboard');
    res.json({ ok: true, status: 'sent_back' });
  } catch (err) {
    console.error('[admin.invoices.send-back] ERROR:', err);
    res.status(500).json({ error: 'Failed to send invoice back' });
  }
}
