/**
 * POST /api/employer/placements/:id/invoice/pay
 * Creates a Razorpay order for the consultant invoice total. Only the organisation
 * owner or Finance role can pay, same rule as wallet top-ups. The amount is taken
 * from the server-side invoice, never from the request.
 * Returns: { order_id, amount, currency, key_id }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement, consultantInvoice, invoicePayment } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { getOrgRole, canManageBilling } from '@/server/lib/orgPermissions.js';
import { getRazorpay } from '@/server/lib/razorpayClient.js';
import { invoiceSplitPaise } from '@/server/lib/invoicePaymentMath.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer') return res.status(403).json({ error: 'Employer access required' });
    if (!canManageBilling(await getOrgRole(session.user.id))) {
      return res.status(403).json({ error: 'Only the organization owner or Finance role can pay invoices' });
    }

    const placementId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const [plc] = await db.select().from(placement).where(eq(placement.id, placementId)).limit(1);
    if (!plc) return res.status(404).json({ error: 'Placement not found' });
    if (plc.employerUserId !== session.user.id) return res.status(403).json({ error: 'Not your placement' });

    const [invoice] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);
    if (!invoice || invoice.status !== 'sent_to_employer') {
      return res.status(409).json({ error: 'This invoice is not ready for payment yet.' });
    }

    const paidRows = await db.select({ status: invoicePayment.status }).from(invoicePayment)
      .where(eq(invoicePayment.placementId, placementId));
    if (paidRows.some(r => r.status === 'paid')) {
      return res.status(409).json({ error: 'This invoice has already been paid.' });
    }

    const split = invoiceSplitPaise({
      feeLpa: invoice.feeAmountLpa,
      platformLpa: invoice.platformAmountLpa,
      totalLpa: invoice.totalAmountLpa,
    });
    if (split.totalPaise < 100) return res.status(400).json({ error: 'Invoice amount is too small to pay.' });

    const { client, key_id } = getRazorpay();
    const order = await client.orders.create({
      amount: split.totalPaise,
      currency: 'INR',
      receipt: `inv_${placementId}_${Date.now()}`,
      notes: { placementId: String(placementId), type: 'consultant_invoice', platform: 'TRICCI' },
    });

    await db.insert(invoicePayment).values({
      placementId,
      razorpayOrderId: order.id,
      amountPaise: split.totalPaise,
      feePaise: split.feePaise,
      platformPaise: split.platformPaise,
      consultantPaise: split.consultantPaise,
      gstPaise: split.gstPaise,
      status: 'created',
    });

    console.log(`[invoice.pay] order=${order.id} placement=${placementId} amount=${split.totalPaise}`);
    res.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id });
  } catch (err) {
    console.error('[invoice.pay] ERROR:', err);
    res.status(500).json({ error: 'Failed to start payment. Please try again.' });
  }
}
