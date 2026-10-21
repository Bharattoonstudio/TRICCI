/**
 * Unit tests: consultant plan share of the placement fee. Pure logic only.
 */
import { describe, it, expect } from 'vitest';
import { consultantSharePctForPlan, placementFeeForOffer } from '../server/lib/employerFee';

describe('consultantSharePctForPlan', () => {
  it('gives Free consultants 80%', () => {
    expect(consultantSharePctForPlan('free')).toBe(80);
  });
  it('gives Pro consultants 85%', () => {
    expect(consultantSharePctForPlan('pro')).toBe(85);
  });
  it('falls back to Free for unknown or missing plans', () => {
    expect(consultantSharePctForPlan(null)).toBe(80);
    expect(consultantSharePctForPlan(undefined)).toBe(80);
    expect(consultantSharePctForPlan('agency')).toBe(80);
  });
});

describe('placementFeeForOffer with a plan share', () => {
  const pct10 = { feeType: 'percent' as const, feePercent: 10, feeAmountRupees: null };

  it('Free: consultant gets 80% of a 10% fee on a 10 LPA offer (0.8 LPA)', () => {
    const r = placementFeeForOffer(pct10, 10, true, 80);
    expect(r.consultantFeeAmountLpa).toBeCloseTo(0.8, 6);
    expect(r.platformFeePercent).toBeCloseTo(2, 6); // 20% of a 10% fee (2 points of CTC)
  });

  it('Pro: consultant gets 85% of a 10% fee on a 10 LPA offer (0.85 LPA)', () => {
    const r = placementFeeForOffer(pct10, 10, true, 85);
    expect(r.consultantFeeAmountLpa).toBeCloseTo(0.85, 6);
    expect(r.platformFeePercent).toBeCloseTo(1.5, 6); // 15% of a 10% fee (1.5 points of CTC)
  });

  it('Pro: platform keeps 15% of a fixed ₹1,00,000 fee', () => {
    const fixed = { feeType: 'amount' as const, feePercent: 0, feeAmountRupees: 100000 };
    const r = placementFeeForOffer(fixed, 20, true, 85);
    expect(r.consultantFeeAmountLpa).toBeCloseTo(0.85, 6);
  });

  it('no consultant: the full fee stays with the platform, regardless of plan', () => {
    const r = placementFeeForOffer(pct10, 10, false, 85);
    expect(r.consultantFeeAmountLpa).toBe(0);
    expect(r.platformFeePercent).toBeCloseTo(10, 6);
  });
});
