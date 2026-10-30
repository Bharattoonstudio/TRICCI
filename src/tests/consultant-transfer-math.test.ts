import { describe, it, expect } from 'vitest';
import { consultantDuePaise, gstDuePaise, validateTransfer, summarisePayouts } from '../server/lib/consultantTransferMath';

describe('due amounts', () => {
  it('base due is the consultant share less base paid, never negative', () => {
    expect(consultantDuePaise(14_400_000, 0)).toBe(14_400_000);
    expect(consultantDuePaise(14_400_000, 4_400_000)).toBe(10_000_000);
    expect(consultantDuePaise(14_400_000, 15_000_000)).toBe(0);
  });
  it('GST due is the GST collected less GST paid, never negative', () => {
    expect(gstDuePaise(3_240_000, 0)).toBe(3_240_000);
    expect(gstDuePaise(3_240_000, 3_240_000)).toBe(0);
  });
});

describe('validateTransfer', () => {
  const ok = { amountPaise: 1_000_000, gstPaise: 0, reference: 'UTR123456' };
  it('accepts a valid transfer within the base and GST due', () => {
    expect(validateTransfer(ok, 1_000_000, 0)).toBeNull();
    expect(validateTransfer({ ...ok, gstPaise: 180_000 }, 1_000_000, 180_000)).toBeNull();
  });
  it('rejects overpayment of the base share', () => {
    expect(validateTransfer({ ...ok, amountPaise: 1_000_001 }, 1_000_000, 0)).toMatch(/more than the amount due/);
  });
  it('rejects GST above the GST due', () => {
    expect(validateTransfer({ ...ok, gstPaise: 180_001 }, 1_000_000, 180_000)).toMatch(/GST is more than/);
  });
  it('rejects non-integer, zero or negative amounts and negative GST', () => {
    expect(validateTransfer({ ...ok, amountPaise: 10.5 }, 1_000_000, 0)).not.toBeNull();
    expect(validateTransfer({ ...ok, amountPaise: 0 }, 1_000_000, 0)).not.toBeNull();
    expect(validateTransfer({ ...ok, amountPaise: -5 }, 1_000_000, 0)).not.toBeNull();
    expect(validateTransfer({ ...ok, gstPaise: -1 }, 1_000_000, 0)).not.toBeNull();
  });
  it('requires a reference of 3 to 128 characters', () => {
    expect(validateTransfer({ ...ok, reference: 'ab' }, 1_000_000, 0)).not.toBeNull();
    expect(validateTransfer({ ...ok, reference: 'x'.repeat(129) }, 1_000_000, 0)).not.toBeNull();
    expect(validateTransfer({ ...ok, reference: undefined }, 1_000_000, 0)).not.toBeNull();
  });
  it('rejects recording when nothing is due', () => {
    expect(validateTransfer(ok, 0, 0)).toMatch(/Nothing is due/);
  });
});

describe('summarisePayouts', () => {
  it('totals the TRICCI share, consultant share, paid out and still due', () => {
    const t = summarisePayouts([
      { amountPaise: 21_240_000, platformPaise: 3_600_000, gstPaise: 3_240_000, consultantPaise: 14_400_000, paidOutPaise: 4_400_000, duePaise: 10_000_000 },
      { amountPaise: 10_000_000, platformPaise: 2_000_000, gstPaise: 0, consultantPaise: 8_000_000, paidOutPaise: 8_000_000, duePaise: 0 },
    ]);
    expect(t.receivedPaise).toBe(31_240_000);
    expect(t.tricciPaise).toBe(5_600_000);
    expect(t.consultantPaise).toBe(22_400_000);
    expect(t.paidOutPaise).toBe(12_400_000);
    expect(t.duePaise).toBe(10_000_000);
  });
});
