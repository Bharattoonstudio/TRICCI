/**
 * Unit tests: employer placement fee options (percentage or fixed amount).
 * Pure logic only — does not touch the database.
 */
import { describe, it, expect } from 'vitest';
import { validateEmployerFee, placementFeeForOffer, formatFeeLabel, consultantShareFor } from '../server/lib/employerFee';

describe('validateEmployerFee — percentage option', () => {
  it('accepts 5% and 35% (the boundaries)', () => {
    expect(validateEmployerFee({ feeType: 'percent', feePercent: 5 })).toMatchObject({ ok: true, fee: { feeType: 'percent', feePercent: 5, feeAmountRupees: null } });
    expect(validateEmployerFee({ feeType: 'percent', feePercent: 35 })).toMatchObject({ ok: true, fee: { feePercent: 35 } });
  });

  it('rejects values just outside 5% to 35%', () => {
    expect(validateEmployerFee({ feeType: 'percent', feePercent: 4.9 }).ok).toBe(false);
    expect(validateEmployerFee({ feeType: 'percent', feePercent: 35.1 }).ok).toBe(false);
  });

  it('rejects a missing or non-numeric percentage', () => {
    expect(validateEmployerFee({ feeType: 'percent' }).ok).toBe(false);
    expect(validateEmployerFee({ feeType: 'percent', feePercent: 'abc' }).ok).toBe(false);
  });

  it('treats a missing feeType as percentage', () => {
    expect(validateEmployerFee({ feePercent: 8 })).toMatchObject({ ok: true, fee: { feeType: 'percent', feePercent: 8 } });
  });

  it('rejects an unknown feeType', () => {
    expect(validateEmployerFee({ feeType: 'flat', feePercent: 8 }).ok).toBe(false);
  });
});

describe('validateEmployerFee — fixed amount option', () => {
  it('accepts exactly ₹50,000 (the minimum)', () => {
    expect(validateEmployerFee({ feeType: 'amount', feeAmountRupees: 50000 })).toMatchObject({
      ok: true,
      fee: { feeType: 'amount', feePercent: 0, feeAmountRupees: 50000 },
    });
  });

  it('rejects ₹49,999', () => {
    expect(validateEmployerFee({ feeType: 'amount', feeAmountRupees: 49999 }).ok).toBe(false);
  });

  it('accepts amounts with no maximum', () => {
    expect(validateEmployerFee({ feeType: 'amount', feeAmountRupees: 25000000 })).toMatchObject({
      ok: true,
      fee: { feeAmountRupees: 25000000 },
    });
  });

  it('rejects zero, negative and blank amounts', () => {
    expect(validateEmployerFee({ feeType: 'amount', feeAmountRupees: 0 }).ok).toBe(false);
    expect(validateEmployerFee({ feeType: 'amount', feeAmountRupees: -100000 }).ok).toBe(false);
    expect(validateEmployerFee({ feeType: 'amount' }).ok).toBe(false);
  });
});

describe('placementFeeForOffer', () => {
  it('applies a percentage to the offer CTC', () => {
    // 8% of ₹20 LPA offer = ₹1.6 LPA fee
    const r = placementFeeForOffer({ feeType: 'percent', feePercent: 8, feeAmountRupees: null }, 20, false);
    expect(r.feeAmountLpa).toBeCloseTo(1.6);
    expect(r.feePercent).toBeCloseTo(8);
    expect(r.platformFeePercent).toBeCloseTo(8);
    expect(r.consultantFeeAmountLpa).toBe(0);
  });

  it('uses a fixed amount as-is and derives the effective percentage', () => {
    // ₹1,00,000 fixed fee on ₹10 LPA offer = 1.0 LPA = 10%
    const r = placementFeeForOffer({ feeType: 'amount', feePercent: 0, feeAmountRupees: 100000 }, 10, false);
    expect(r.feeAmountLpa).toBeCloseTo(1);
    expect(r.feePercent).toBeCloseTo(10);
  });

  it('gives the consultant 80% of the fee when a consultant is involved', () => {
    // 10% of ₹10 LPA = ₹1.0 LPA fee: platform keeps 20% (₹0.2 LPA), consultant gets 80% (₹0.8 LPA)
    const r = placementFeeForOffer({ feeType: 'percent', feePercent: 10, feeAmountRupees: null }, 10, true);
    expect(r.platformFeePercent).toBeCloseTo(2);
    expect(r.consultantFeeAmountLpa).toBeCloseTo(0.8);
    expect(r.consultantFeePercent).toBeCloseTo(8);
  });

  it('gives the consultant 80% of a fixed fee', () => {
    // ₹1,00,000 fixed fee on a 20 LPA offer: consultant gets ₹80,000 (0.8 LPA)
    const r = placementFeeForOffer({ feeType: 'amount', feePercent: 0, feeAmountRupees: 100000 }, 20, true);
    expect(r.consultantFeeAmountLpa).toBeCloseTo(0.8);
  });
});

describe('consultantShareFor', () => {
  it('shows 8% when the employer enters 10%', () => {
    const s = consultantShareFor({ feeType: 'percent', feePercent: 10, feeAmountRupees: null });
    expect(s.consultantFeePercent).toBe(8);
    expect(s.consultantFeeLabel).toBe('8% of CTC');
  });

  it('shows 6.8% when the employer enters 8.5%', () => {
    const s = consultantShareFor({ feeType: 'percent', feePercent: 8.5, feeAmountRupees: null });
    expect(s.consultantFeePercent).toBe(6.8);
  });

  it('shows ₹80,000 when the employer enters ₹1,00,000', () => {
    const s = consultantShareFor({ feeType: 'amount', feePercent: 0, feeAmountRupees: 100000 });
    expect(s.consultantFeeAmountRupees).toBe(80000);
    expect(s.consultantFeeLabel).toBe('₹80,000 fixed');
  });
});

describe('formatFeeLabel', () => {
  it('labels percentage fees', () => {
    expect(formatFeeLabel({ feeType: 'percent', feePercent: 8 })).toBe('8% of offer CTC');
  });

  it('labels fixed fees in rupees', () => {
    expect(formatFeeLabel({ feeType: 'amount', feePercent: 0, feeAmountRupees: 75000 })).toBe('₹75,000 fixed fee');
  });
});
