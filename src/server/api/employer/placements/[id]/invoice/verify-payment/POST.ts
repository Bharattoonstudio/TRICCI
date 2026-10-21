/**
 * POST /api/employer/placements/:id/invoice/verify-payment
 * Checks the Razorpay checkout signature and marks the invoice paid.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { invoicePayment } from '@/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { verifyPaymentSignature } from '@/server/lib/invoicePaymentMath.js';
import { markInvoicePaid } from '@/server/lib/invoicePaymentStore.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer') return res.status(403).json({ error: 'Employer access required' });

    const placementId = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required payment fields' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(500).json({ error: 'Payment configuration error' });
    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, keySecret)) {
      console.warn(`[invoice.verify] SIGNATURE MISMATCH order=${razorpay_order_id}`);
      return res.status(400).json({ error: 'Payment verification failed. Please contact support.' });
    }

    // The order must belong to this placement and to this employer.
    const [row] = await db.select({ id: invoicePayment.id }).from(invoicePayment)
      .where(and(eq(invoicePayment.razorpayOrderId, razorpay_order_id), eq(invoicePayment.placementId, placementId)))
      .limit(1);
    if (!row) return res.status(404).json({ error: 'Payment not found for this placement' });

    const result = await markInvoicePaid(razorpay_order_id, razorpay_payment_id);
    if (!result.ok && result.reason !== 'already_paid') {
      return res.status(409).json({ error: 'Payment could not be recorded.' });
    }
    res.json({ success: true, already_processed: !result.ok });
  } catch (err) {
    console.error('[invoice.verify] ERROR:', err);
    res.status(500).json({ error: 'Payment verification failed. Please contact support.' });
  }
}
