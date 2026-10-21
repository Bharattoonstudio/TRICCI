/**
 * Consultant payout release rule (pure logic, no DB or payment calls).
 *
 * Day 0 = the candidate's joining date (UTC calendar day).
 * - Employer evaluation / refund window closes at day 90 (the 45-day term is
 *   checked against the same day 0).
 * - Consultant share is releasable on day 92, a two-day buffer past the window.
 * - Release also requires that the employer has paid TRICCI.
 * - Any admin hold, or a refund on record, blocks release.
 */

export const REFUND_WINDOW_DAYS = 90;
export const RELEASE_DAY = 92;

const DAY_MS = 24 * 60 * 60 * 1000;

export type PayoutStatus =
  | 'awaiting_joining'
  | 'awaiting_employer_payment'
  | 'held'
  | 'on_hold'
  | 'refunded'
  | 'releasable';

export interface PayoutInput {
  joiningDate: Date | null;
  employerPaidAt: Date | null;
  adminHold: boolean;
  refundedAt: Date | null;
}

export interface PayoutDecision {
  status: PayoutStatus;
  refundWindowEndsAt: Date | null;
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
    return { status: 'awaiting_joining', refundWindowEndsAt: null, releaseDueAt: null, canRelease: false };
  }

  const refundWindowEndsAt = addDays(input.joiningDate, REFUND_WINDOW_DAYS);
  const releaseDueAt = addDays(input.joiningDate, RELEASE_DAY);

  let status: PayoutStatus;
  if (input.refundedAt) status = 'refunded';
  else if (input.adminHold) status = 'on_hold';
  else if (!input.employerPaidAt) status = 'awaiting_employer_payment';
  else if (now.getTime() < releaseDueAt.getTime()) status = 'held';
  else status = 'releasable';

  return {
    status,
    refundWindowEndsAt,
    releaseDueAt,
    canRelease: status === 'releasable',
  };
}

/** Idempotency key so a retried scheduled job never sends the same transfer twice. */
export function payoutIdempotencyKey(submissionId: string): string {
  return `consultant-payout:${submissionId}`;
}
