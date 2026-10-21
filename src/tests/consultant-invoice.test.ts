import { describe, it, expect } from 'vitest';
import { computeInvoiceAmounts, DEFAULT_GST_RATE_PCT } from '../server/lib/consultantInvoice';

const pct10 = { feeType: 'percent' as const, feePercent: 10, feeAmountRupees: null };

describe('computeInvoiceAmounts', () => {
  it('splits the fee 20% platform / 80% consultant on a percentage job', () => {
    const r = computeInvoiceAmounts({ fee: pct10, offerCtcLpa: 10, consultantSharePct: 80, gstEnabled: false });
    expect(r.feeAmountLpa).toBeCloseTo(1.0, 6);
    expect(r.consultantAmountLpa).toBeCloseTo(0.8, 6);
    expect(r.platformAmountLpa).toBeCloseTo(0.2, 6);
    expect(r.platformSharePct).toBe(20);
    expect(r.consultantSharePct).toBe(80);
  });

  it('adds no GST when GST is off', () => {
    const r = computeInvoiceAmounts({ fee: pct10, offerCtcLpa: 10, consultantSharePct: 80, gstEnabled: false });
    expect(r.gstAmountLpa).toBe(0);
    expect(r.totalAmountLpa).toBeCloseTo(1.0, 6);
  });

  it('adds GST on the full fee when GST is on', () => {
    const r = computeInvoiceAmounts({ fee: pct10, offerCtcLpa: 10, consultantSharePct: 80, gstEnabled: true });
    expect(DEFAULT_GST_RATE_PCT).toBe(18);
    expect(r.gstAmountLpa).toBeCloseTo(0.18, 6);
    expect(r.totalAmountLpa).toBeCloseTo(1.18, 6);
  });

  it('handles a fixed-amount fee: ₹1,00,000 splits to ₹80,000 consultant', () => {
    const fixed = { feeType: 'amount' as const, feePercent: 0, feeAmountRupees: 100000 };
    const r = computeInvoiceAmounts({ fee: fixed, offerCtcLpa: 12, consultantSharePct: 80, gstEnabled: false });
    expect(r.feeAmountLpa).toBeCloseTo(1.0, 6);
    expect(r.consultantAmountLpa).toBeCloseTo(0.8, 6);
  });
});
