import { describe, it, expect } from 'vitest';
import { decidePayoutRelease, payoutIdempotencyKey, EVALUATION_DAYS, EMPLOYER_PAYMENT_DAYS } from '../server/lib/payoutRelease';

const joining = new Date('2026-01-01T10:00:00Z');
const dayN = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 86400000);
const invoiced = dayN(90);

const base = { joiningDate: joining, invoiceSubmittedAt: null, employerPaidAt: null, adminHold: false, refundedAt: null };

describe('decidePayoutRelease', () => {
  it('uses day 90 for the evaluation end and 10 days for employer payment', () => {
    expect(EVALUATION_DAYS).toBe(90);
    expect(EMPLOYER_PAYMENT_DAYS).toBe(10);
    const d = decidePayoutRelease({ ...base, invoiceSubmittedAt: invoiced }, dayN(90));
    expect(d.evaluationEndsAt?.toISOString()).toBe(dayN(90).toISOString());
    expect(d.paymentDueAt?.toISOString()).toBe(dayN(100).toISOString());
  });

  it('is awaiting_joining without a joining date', () => {
    const d = decidePayoutRelease({ ...base, joiningDate: null }, dayN(100));
    expect(d.status).toBe('awaiting_joining');
    expect(d.canInvoice).toBe(false);
  });

  it('is in evaluation before day 90 and cannot invoice', () => {
    const d = decidePayoutRelease(base, dayN(89));
    expect(d.status).toBe('evaluation');
    expect(d.canInvoice).toBe(false);
  });

  it('can invoice from day 90 onward', () => {
    const d = decidePayoutRelease(base, dayN(90));
    expect(d.status).toBe('awaiting_invoice');
    expect(d.canInvoice).toBe(true);
  });

  it('waits for employer payment after the invoice is raised', () => {
    const d = decidePayoutRelease({ ...base, invoiceSubmittedAt: invoiced }, dayN(95));
    expect(d.status).toBe('awaiting_employer_payment');
    expect(d.canInvoice).toBe(false);
  });

  it('is paid once the employer has paid', () => {
    const d = decidePayoutRelease({ ...base, invoiceSubmittedAt: invoiced, employerPaidAt: dayN(98) }, dayN(99));
    expect(d.status).toBe('paid');
  });

  it('blocks payment while an admin hold is set', () => {
    const d = decidePayoutRelease({ ...base, invoiceSubmittedAt: invoiced, adminHold: true }, dayN(120));
    expect(d.status).toBe('on_hold');
    expect(d.canInvoice).toBe(false);
  });

  it('blocks payment when a refund is on record', () => {
    const d = decidePayoutRelease({ ...base, invoiceSubmittedAt: invoiced, refundedAt: dayN(95) }, dayN(120));
    expect(d.status).toBe('refunded');
  });

  it('counts days from the UTC calendar day of joining, not the time of day', () => {
    const late = new Date('2026-01-01T23:59:00Z');
    const d = decidePayoutRelease({ ...base, joiningDate: late }, dayN(90));
    expect(d.evaluationEndsAt?.toISOString()).toBe(dayN(90).toISOString());
  });
});

describe('payoutIdempotencyKey', () => {
  it('is stable per submission', () => {
    expect(payoutIdempotencyKey('abc')).toBe('consultant-payout:abc');
    expect(payoutIdempotencyKey(42)).toBe('consultant-payout:42');
  });
});
