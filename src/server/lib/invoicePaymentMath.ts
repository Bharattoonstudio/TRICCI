/**
 * Invoice payment maths and Razorpay signature checks (pure, no DB).
 * 1 LPA = ₹1,00,000 = 1,00,00,000 paise. Amounts are converted once, at order time.
 * The split is derived so the parts always add up to the amount the employer pays:
 *   consultant = fee − platform, gst = total − fee.
 */
import { createHmac, timingSafeEqual } from 'crypto';

const PAISE_PER_LPA = 10_000_000;

export function lpaToPaise(lpa: number): number {
  return Math.round(lpa * PAISE_PER_LPA);
}

export interface InvoiceSplitPaise {
  totalPaise: number;
  feePaise: number;
  platformPaise: number;
  consultantPaise: number;
  gstPaise: number;
}

export function invoiceSplitPaise(input: { feeLpa: number; platformLpa: number; totalLpa: number }): InvoiceSplitPaise {
  const totalPaise = lpaToPaise(input.totalLpa);
  const feePaise = lpaToPaise(input.feeLpa);
  const platformPaise = lpaToPaise(input.platformLpa);
  return {
    totalPaise,
    feePaise,
    platformPaise,
    consultantPaise: feePaise - platformPaise,
    gstPaise: totalPaise - feePaise,
  };
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Checkout callback signature: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  const expected = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: Buffer | string, signature: string, webhookSecret: string): boolean {
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return safeEqualHex(expected, signature);
}
