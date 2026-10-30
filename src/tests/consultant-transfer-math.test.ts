import { describe, it, expect } from 'vitest';
import { consultantDuePaise, validateTransfer } from '../server/lib/consultantTransferMath';

describe('consultantDuePaise', () => {
  it('is the consultant share less what has been paid out, never negative', () => {
    expect(consultantDuePaise(14_400_000, 0)).toBe(14_400_000);
    expect(consultantDuePaise(14_400_000, 4_400_000)).toBe(10_000_000);
    expect(consultantDuePaise(14_400_000, 15_000_000)).toBe(0);
  });
});

describe('validateTransfer', () => {
  const ok = { amountPaise: 1_000_000, reference: 'UTR123456' };
  it('accepts a valid transfer within the due amount', () => {
    expect(validateTransfer(ok, 1_000_000)).toBeNull();
  });
  it('rejects overpayment', () => {
    expect(validateTransfer({ ...ok, amountPaise: 1_000_001 }, 1_000_000)).toMatch(/more than the amount due/);
  });
  it('rejects non-integer, zero or negative amounts', () => {
    expect(validateTransfer({ ...ok, amountPaise: 10.5 }, 1_000_000)).not.toBeNull();
    expect(validateTransfer({ ...ok, amountPaise: 0 }, 1_000_000)).not.toBeNull();
    expect(validateTransfer({ ...ok, amountPaise: -5 }, 1_000_000)).not.toBeNull();
  });
  it('requires a reference of 3 to 128 characters', () => {
    expect(validateTransfer({ ...ok, reference: 'ab' }, 1_000_000)).not.toBeNull();
    expect(validateTransfer({ ...ok, reference: 'x'.repeat(129) }, 1_000_000)).not.toBeNull();
    expect(validateTransfer({ ...ok, reference: undefined }, 1_000_000)).not.toBeNull();
  });
  it('rejects recording when nothing is due', () => {
    expect(validateTransfer(ok, 0)).toMatch(/Nothing is due/);
  });
});
