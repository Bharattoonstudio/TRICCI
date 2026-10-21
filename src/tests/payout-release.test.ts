import { describe, it, expect } from 'vitest';
import { decidePayoutRelease, payoutIdempotencyKey, RELEASE_DAY, REFUND_WINDOW_DAYS } from '../server/lib/payoutRelease';

const joining = new Date('2026-01-01T10:00:00Z');
const paid = new Date('2026-01-10T00:00:00Z');
const dayN = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 86400000);

const base = { joiningDate: joining, employerPaidAt: paid, adminHold: false, refundedAt: null };

describe('decidePayoutRelease', () => {
  it('uses day 90 for the refund window and day 92 for release', () => {
    expect(REFUND_WINDOW_DAYS).toBe(90);
    expect(RELEASE_DAY).toBe(92);
    const d = decidePayoutRelease(base, dayN(0));
    expect(d.refundWindowEndsAt?.toISOString()).toBe(dayN(90).toISOString());
    expect(d.releaseDueAt?.toISOString()).toBe(dayN(92).toISOString());
  });

  it('is awaiting_joining when there is no joining date', () => {
    const d = decidePayoutRelease({ ...base, joiningDate: null }, dayN(100));
    expect(d.status).toBe('awaiting_joining');
    expect(d.canRelease).toBe(false);
  });

  it('is held before day 92 even if the employer has paid', () => {
    expect(decidePayoutRelease(base, dayN(91)).status).toBe('held');
    expect(decidePayoutRelease(base, dayN(91)).canRelease).toBe(false);
  });

  it('is releasable on day 92 once the employer has paid', () => {
    const d = decidePayoutRelease(base, dayN(92));
    expect(d.status).toBe('releasable');
    expect(d.canRelease).toBe(true);
  });

  it('never releases before the employer has paid, even after day 92', () => {
    const d = decidePayoutRelease({ ...base, employerPaidAt: null }, dayN(120));
    expect(d.status).toBe('awaiting_employer_payment');
    expect(d.canRelease).toBe(false);
  });

  it('blocks release while an admin hold is set', () => {
    const d = decidePayoutRelease({ ...base, adminHold: true }, dayN(120));
    expect(d.status).toBe('on_hold');
    expect(d.canRelease).toBe(false);
  });

  it('blocks release when a refund is on record', () => {
    const d = decidePayoutRelease({ ...base, refundedAt: dayN(30) }, dayN(120));
    expect(d.status).toBe('refunded');
    expect(d.canRelease).toBe(false);
  });

  it('counts days from the UTC calendar day of joining, not the time of day', () => {
    const late = new Date('2026-01-01T23:59:00Z');
    const d = decidePayoutRelease({ ...base, joiningDate: late }, dayN(92));
    expect(d.releaseDueAt?.toISOString()).toBe(dayN(92).toISOString());
  });
});

describe('payoutIdempotencyKey', () => {
  it('is stable per submission', () => {
    expect(payoutIdempotencyKey('abc')).toBe('consultant-payout:abc');
  });
});
