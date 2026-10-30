/**
 * POST /api/invoices/:placementId/thread
 * Body: { message: string, raiseQuery?: boolean }
 * Admin and consultant reply. The employer can reply, or raise a query while the invoice is
 * with them: that sends the invoice back to the consultant to fix and resubmit.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice, invoiceMessage, placement } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { resolveInvoiceViewer } from '@/server/lib/invoiceAccess.js';
import { canEmployerRespond, type InvoiceStatus } from '@/server/lib/invoiceStatus.js';
import { notifyUser, notifyAdmins } from '@/server/lib/invoiceReview.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const role = (session.user as { role?: string }).role;
    const placementId = parseInt(String(req.params.placementId), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const viewer = await resolveInvoiceViewer(session.user.id, role, placementId);
    if (!viewer) return res.status(403).json({ error: 'Not allowed' });

    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const raiseQuery = req.body?.raiseQuery === true;
    if (message.length < 2 || message.length > 2000) {
      return res.status(400).json({ error: 'Write a message of 2 to 2000 characters.' });
    }
    if (raiseQuery && viewer !== 'employer') {
      return res.status(403).json({ error: 'Only the employer can raise a query.' });
    }

    const [inv] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);
    const [plc] = await db.select({ candidateName: placement.candidateName, jobTitle: placement.jobTitle, consultantUserId: placement.consultantUserId })
      .from(placement).where(eq(placement.id, placementId)).limit(1);
    if (!inv || !plc) return res.status(404).json({ error: 'Invoice not found' });

    if (raiseQuery && !canEmployerRespond(inv.status as InvoiceStatus)) {
      return res.status(409).json({ error: 'A query can only be raised while the invoice is with you for approval.' });
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.insert(invoiceMessage).values({
        placementId,
        authorUserId: session.user.id,
        authorRole: viewer,
        kind: raiseQuery ? 'query' : 'reply',
        body: message,
      });
      if (raiseQuery) {
        await tx.update(consultantInvoice)
          .set({ status: 'sent_back', adminRemarks: message, updatedAt: now })
          .where(eq(consultantInvoice.placementId, placementId));
      }
    });

    const label = `${plc.candidateName} · ${plc.jobTitle}`;
    if (raiseQuery) {
      await notifyUser(plc.consultantUserId, 'invoice_query', `The employer has a query on the invoice for ${label}. Please check and resubmit.`, '/consultant/dashboard');
      await notifyAdmins('invoice_query', `Employer raised a query on the invoice for ${label}.`, `/admin/invoices`);
    } else if (viewer === 'consultant') {
      await notifyAdmins('invoice_message', `Consultant replied on the invoice for ${label}.`, `/admin/invoices`);
    } else if (viewer === 'admin') {
      await notifyUser(plc.consultantUserId, 'invoice_message', `TRICCI replied on the invoice for ${label}.`, '/consultant/dashboard');
    }

    res.json({ ok: true, status: raiseQuery ? 'sent_back' : inv.status });
  } catch (err) {
    console.error('[invoice.thread.post] ERROR:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
}
