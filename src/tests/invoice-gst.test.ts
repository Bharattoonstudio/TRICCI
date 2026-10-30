import { describe, it, expect } from 'vitest';
import { gstForFee } from '../server/lib/invoiceGst';
import { canEditGst } from '../server/lib/invoiceStatus';

describe('gstForFee', () => {
  it('adds 18% GST on the placement fee when enabled', () => {
    const r = gstForFee(1.8, 18, true);
    expect(r.gstAmountLpa).toBeCloseTo(0.324, 6);
    expect(r.totalAmountLpa).toBeCloseTo(2.124, 6);
  });
  it('charges nothing when disabled', () => {
    const r = gstForFee(1.8, 18, false);
    expect(r.gstAmountLpa).toBe(0);
    expect(r.totalAmountLpa).toBe(1.8);
  });
});

describe('canEditGst', () => {
  it('allows changes until the invoice goes to the employer', () => {
    expect(canEditGst('submitted')).toBe(true);
    expect(canEditGst('approved')).toBe(true);
    expect(canEditGst('sent_back')).toBe(true);
    expect(canEditGst('sent_to_employer')).toBe(false);
    expect(canEditGst('paid')).toBe(false);
    expect(canEditGst('draft')).toBe(false);
  });
});
