/** POST /api/admin/invoices/:placementId/send-to-employer — admin sends an approved invoice to the employer. */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/server/lib/adminAuth.js';
import { loadInvoiceWithPlacement, notifyUser } from '@/server/lib/invoiceReview.js';
import { canSendToEmployer } from '@/server/lib/invoiceStatus.js';

export default async function handler(req: Request, res: Response) {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const placementId = parseInt(String(req.params.placementId), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const { invoice, placement: plc } = await loadInvoiceWithPlacement(placementId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (!canSendToEmployer(invoice.status)) return res.status(409).json({ error: 'Approve the invoice before sending it to the employer.' });

    const now = new Date();
    await db.update(consultantInvoice).set({
      status: 'sent_to_employer', sentToEmployerAt: now, reviewedByUserId: adminId, updatedAt: now,
    }).where(eq(consultantInvoice.placementId, placementId));

    await notifyUser(plc?.employerUserId, 'invoice_received',
      `An invoice for ${plc?.candidateName ?? 'your placement'} (${plc?.jobTitle ?? ''}) is ready to review.`,
      '/employer/dashboard');
    res.json({ ok: true, status: 'sent_to_employer' });
  } catch (err) {
    console.error('[admin.invoices.send-to-employer] ERROR:', err);
    res.status(500).json({ error: 'Failed to send invoice to employer' });
  }
}
