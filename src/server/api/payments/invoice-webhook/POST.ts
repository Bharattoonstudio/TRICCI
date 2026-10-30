/**
 * POST /api/payments/invoice-webhook
 * Razorpay webhook. Handles payment.captured for consultant-invoice orders, so an
 * invoice is still marked paid if the browser never returns from checkout.
 * Verifies X-Razorpay-Signature over the raw body. Requires RAZORPAY_WEBHOOK_SECRET.
 * Wallet top-up orders are not in invoice_payment and are ignored here.
 */
import type { Request, Response } from 'express';
import { verifyWebhookSignature } from '@/server/lib/invoicePaymentMath.js';
import { markInvoicePaid } from '@/server/lib/invoicePaymentStore.js';
import { notifyAdminsInvoicePaid } from '@/server/lib/invoiceEmails.js';
import { db } from '@/server/db/client.js';
import { invoicePayment } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[invoice.webhook] RAZORPAY_WEBHOOK_SECRET not set');
      return res.status(500).json({ error: 'Webhook not configured' });
    }
    const signature = req.headers['x-razorpay-signature'];
    const raw = req.body as Buffer;
    if (typeof signature !== 'string' || !Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, signature, secret)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(raw.toString('utf8')) as {
      event?: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } };
    };
    if (event.event !== 'payment.captured') return res.json({ ok: true, ignored: true });

    const entity = event.payload?.payment?.entity;
    if (!entity?.id || !entity.order_id) return res.json({ ok: true, ignored: true });

    const [row] = await db.select({ id: invoicePayment.id }).from(invoicePayment)
      .where(eq(invoicePayment.razorpayOrderId, entity.order_id)).limit(1);
    if (!row) return res.json({ ok: true, ignored: true });

    const result = await markInvoicePaid(entity.order_id, entity.id, entity.amount);
    if (result.ok) void notifyAdminsInvoicePaid(result.placementId);
    if (!result.ok && result.reason === 'amount_mismatch') {
      console.error(`[invoice.webhook] AMOUNT MISMATCH order=${entity.order_id} payment=${entity.id}`);
    }
    console.log(`[invoice.webhook] order=${entity.order_id} result=${result.ok ? 'paid' : result.reason}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[invoice.webhook] ERROR:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
