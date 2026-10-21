/** POST /api/admin/invoices/:placementId/approve — admin approves a submitted invoice. */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/server/lib/adminAuth.js';
import { loadInvoiceWithPlacement, notifyUser } from '@/server/lib/invoiceReview.js';
import { canApprove } from '@/server/lib/invoiceStatus.js';

export default async function handler(req: Request, res: Response) {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const placementId = parseInt(String(req.params.placementId), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const { invoice, placement: plc } = await loadInvoiceWithPlacement(placementId);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (!canApprove(invoice.status)) return res.status(409).json({ error: 'Only a submitted invoice can be approved.' });

    const now = new Date();
    await db.update(consultantInvoice).set({
      status: 'approved', approvedAt: now, reviewedAt: now, reviewedByUserId: adminId, updatedAt: now,
    }).where(eq(consultantInvoice.placementId, placementId));

    await notifyUser(invoice.consultantUserId, 'invoice_approved',
      `Your invoice for ${plc?.candidateName ?? 'a placement'} (${plc?.jobTitle ?? ''}) was approved by TRICCI.`,
      '/consultant/dashboard');
    res.json({ ok: true, status: 'approved' });
  } catch (err) {
    console.error('[admin.invoices.approve] ERROR:', err);
    res.status(500).json({ error: 'Failed to approve invoice' });
  }
}
