/**
 * Consultant payout release rule (pure logic, no DB or payment calls).
 *
 * Day 0 = the candidate's joining date (UTC calendar day).
 * - Employer evaluation / refund window runs through day 90.
 * - Consultant must submit a GST/tax invoice by the end of day 90.
 * - Consultant share is releasable on day 92 (two-day buffer past the window),
 *   only after the employer has paid TRICCI and a valid invoice is on file.
 * - Any admin hold, or a refund on record, blocks release.
 * - An invoice missing or submitted after day 90 is flagged for admin review
 *   (`invoice_late`); it is not released automatically.
 */

export const REFUND_WINDOW_DAYS = 90;
export const INVOICE_DEADLINE_DAY = 90;
export const RELEASE_DAY = 92;

const DAY_MS = 24 * 60 * 60 * 1000;

export type PayoutStatus =
  | 'awaiting_joining'
  | 'awaiting_employer_payment'
  | 'awaiting_invoice'
  | 'invoice_late'
  | 'held'
  | 'on_hold'
  | 'refunded'
  | 'releasable';

export interface PayoutInput {
  joiningDate: Date | null;
  employerPaidAt: Date | null;
  invoiceSubmittedAt: Date | null;
  adminHold: boolean;
  refundedAt: Date | null;
}

export interface PayoutDecision {
  status: PayoutStatus;
  refundWindowEndsAt: Date | null;
  invoiceDeadlineAt: Date | null;
  releaseDueAt: Date | null;
  canRelease: boolean;
}

function utcDayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  return new Date(utcDayStart(d).getTime() + days * DAY_MS);
}

export function decidePayoutRelease(input: PayoutInput, now: Date = new Date()): PayoutDecision {
  if (!input.joiningDate) {
    return { status: 'awaiting_joining', refundWindowEndsAt: null, invoiceDeadlineAt: null, releaseDueAt: null, canRelease: false };
  }

  const refundWindowEndsAt = addDays(input.joiningDate, REFUND_WINDOW_DAYS);
  // Invoice is due by the end of day 90, i.e. before the start of day 91.
  const invoiceDeadlineAt = addDays(input.joiningDate, INVOICE_DEADLINE_DAY + 1);
  const releaseDueAt = addDays(input.joiningDate, RELEASE_DAY);

  const invoiceLate =
    input.invoiceSubmittedAt === null
      ? now.getTime() >= invoiceDeadlineAt.getTime()
      : input.invoiceSubmittedAt.getTime() >= invoiceDeadlineAt.getTime();

  let status: PayoutStatus;
  if (input.refundedAt) status = 'refunded';
  else if (input.adminHold) status = 'on_hold';
  else if (!input.employerPaidAt) status = 'awaiting_employer_payment';
  else if (invoiceLate) status = 'invoice_late';
  else if (input.invoiceSubmittedAt === null) status = 'awaiting_invoice';
  else if (now.getTime() < releaseDueAt.getTime()) status = 'held';
  else status = 'releasable';

  return {
    status,
    refundWindowEndsAt,
    invoiceDeadlineAt,
    releaseDueAt,
    canRelease: status === 'releasable',
  };
}

/** Idempotency key so a retried scheduled job never sends the same transfer twice. */
export function payoutIdempotencyKey(submissionId: string | number): string {
  return `consultant-payout:${submissionId}`;
}
