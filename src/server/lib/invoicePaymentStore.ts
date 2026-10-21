/**
 * Marks a consultant-invoice payment as received. Used by both the browser verify
 * route and the Razorpay webhook, so either can arrive first; the second is a no-op.
 */
import { db } from '../db/client.js';
import { invoicePayment, consultantInvoice, consultantPayout, placement } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export type MarkPaidResult =
  | { ok: true; placementId: number }
  | { ok: false; reason: 'not_found' | 'already_paid' | 'amount_mismatch' };

export async function markInvoicePaid(orderId: string, paymentId: string, paidAmountPaise?: number): Promise<MarkPaidResult> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(invoicePayment).where(eq(invoicePayment.razorpayOrderId, orderId)).limit(1);
    if (!row) return { ok: false, reason: 'not_found' } as const;
    if (paidAmountPaise !== undefined && paidAmountPaise !== row.amountPaise) {
      return { ok: false, reason: 'amount_mismatch' } as const;
    }

    // Claim the row atomically: a concurrent second call finds status already 'paid' and gets no rows back.
    const now = new Date();
    const claimed = await tx.update(invoicePayment)
      .set({ status: 'paid', razorpayPaymentId: paymentId, paidAt: now })
      .where(and(eq(invoicePayment.id, row.id), eq(invoicePayment.status, 'created')))
      .returning({ id: invoicePayment.id });
    if (claimed.length === 0) return { ok: false, reason: 'already_paid' } as const;

    await tx.update(consultantInvoice)
      .set({ status: 'paid', updatedAt: now })
      .where(eq(consultantInvoice.placementId, row.placementId));

    const [pl] = await tx.select({ submissionId: placement.submissionId })
      .from(placement).where(eq(placement.id, row.placementId)).limit(1);
    if (pl?.submissionId) {
      await tx.update(consultantPayout)
        .set({ employerPaidAt: now, updatedAt: now })
        .where(eq(consultantPayout.submissionId, pl.submissionId));
    }
    return { ok: true, placementId: row.placementId } as const;
  });
}
