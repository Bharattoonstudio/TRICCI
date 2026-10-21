/**
 * POST /api/consultant/placements/:id/invoice-draft/submit
 * Submits the draft invoice. Locks it (no further edits) and notifies every admin
 * to review it. Body: { confirmed: true } — the consultant confirmed in the popup.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice, user, notification } from '@/server/db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { loadInvoiceContext } from '@/server/lib/consultantInvoiceLoad.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant') return res.status(403).json({ error: 'Consultant access required' });

    const placementId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    if ((req.body as { confirmed?: unknown })?.confirmed !== true) {
      return res.status(400).json({ error: 'Please confirm before submitting.' });
    }

    const ctx = await loadInvoiceContext(placementId, session.user.id);
    if (!ctx) return res.status(404).json({ error: 'Placement not found' });

    const [invoice] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);
    if (!invoice) return res.status(409).json({ error: 'Generate the invoice before submitting.' });
    if (invoice.status === 'submitted') return res.status(409).json({ error: 'This invoice has already been submitted.' });

    const now = new Date();
    await db.update(consultantInvoice).set({
      status: 'submitted',
      submittedAt: now,
      invoiceNumber: `INV-${placementId}`,
      updatedAt: now,
    }).where(and(eq(consultantInvoice.placementId, placementId), eq(consultantInvoice.status, 'draft')));

    // Tell every admin an invoice is waiting for approval.
    const admins = await db.select({ id: user.id }).from(user).where(and(eq(user.role, 'admin'), isNull(user.suspendedAt)));
    if (admins.length > 0) {
      await db.insert(notification).values(admins.map(a => ({
        userId: a.id,
        type: 'invoice_submitted',
        message: `Invoice submitted for approval: ${ctx.candidateName} — ${ctx.jobTitle} at ${ctx.companyName}`,
        link: `/admin/invoices/${placementId}`,
      })));
    }

    const [updated] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);
    res.json({ ok: true, invoice: updated });
  } catch (err) {
    console.error('[consultant.invoice-draft.submit] ERROR:', err);
    res.status(500).json({ error: 'Failed to submit invoice' });
  }
}
