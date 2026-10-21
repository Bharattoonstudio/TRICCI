/**
 * Consultant payment rule (pure logic, no DB or payment calls).
 *
 * Day 0 = the candidate's joining date (UTC calendar day).
 * - Evaluation period runs through day 90. No invoice can be raised before then.
 * - The consultant raises the invoice on or after day 90, addressed to the employer.
 * - The employer pays within EMPLOYER_PAYMENT_DAYS of the invoice date, through the
 *   TRICCI payment link. The split (TRICCI's Platform Fee, the consultant's share)
 *   is made when that payment is received. The consultant is never paid before it.
 * - An admin hold or a refund on record blocks payment.
 */

export const EVALUATION_DAYS = 90;
export const EMPLOYER_PAYMENT_DAYS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

export type PayoutStatus =
  | 'awaiting_joining'
  | 'evaluation'
  | 'awaiting_invoice'
  | 'awaiting_employer_payment'
  | 'paid'
  | 'on_hold'
  | 'refunded';

export interface PayoutInput {
  joiningDate: Date | null;
  invoiceSubmittedAt: Date | null;
  employerPaidAt: Date | null;
  adminHold: boolean;
  refundedAt: Date | null;
}

export interface PayoutDecision {
  status: PayoutStatus;
  evaluationEndsAt: Date | null;
  paymentDueAt: Date | null;
  canInvoice: boolean;
}

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  return new Date(utcDayStart(d).getTime() + days * DAY_MS);
}

export function decidePayoutRelease(input: PayoutInput, now: Date = new Date()): PayoutDecision {
  if (!input.joiningDate) {
    return { status: 'awaiting_joining', evaluationEndsAt: null, paymentDueAt: null, canInvoice: false };
  }

  const evaluationEndsAt = addDays(input.joiningDate, EVALUATION_DAYS);
  const paymentDueAt = input.invoiceSubmittedAt ? addDays(input.invoiceSubmittedAt, EMPLOYER_PAYMENT_DAYS) : null;
  const evaluationDone = now.getTime() >= evaluationEndsAt.getTime();

  let status: PayoutStatus;
  if (input.refundedAt) status = 'refunded';
  else if (input.adminHold) status = 'on_hold';
  else if (input.employerPaidAt) status = 'paid';
  else if (input.invoiceSubmittedAt) status = 'awaiting_employer_payment';
  else if (!evaluationDone) status = 'evaluation';
  else status = 'awaiting_invoice';

  return {
    status,
    evaluationEndsAt,
    paymentDueAt,
    canInvoice: !input.refundedAt && !input.adminHold && !input.invoiceSubmittedAt && evaluationDone,
  };
}

/** Idempotency key so a retried job never settles the same placement twice. */
export function payoutIdempotencyKey(submissionId: string | number): string {
  return `consultant-payout:${submissionId}`;
}
