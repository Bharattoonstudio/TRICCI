/**
 * Manual consultant payout bookkeeping (pure, no DB or money movement).
 * Flow: employer pays TRICCI -> TRICCI pays the consultant by bank/UPI -> admin records
 * each transfer here with its bank or UPI reference. Recording never sends money.
 */

export function consultantDuePaise(consultantPaise: number, transferredPaise: number): number {
  return Math.max(0, consultantPaise - transferredPaise);
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

/** Returns an error message for the admin, or null when the transfer may be recorded. */
export function validateTransfer(input: { amountPaise: unknown; reference: unknown }, duePaise: number): string | null {
  const { amountPaise, reference } = input;
  if (typeof amountPaise !== 'number' || !Number.isInteger(amountPaise) || amountPaise <= 0) {
    return 'Amount must be a positive whole number of paise.';
  }
  if (typeof reference !== 'string' || reference.trim().length < 3 || reference.trim().length > 128) {
    return 'Enter the bank or UPI reference (3 to 128 characters).';
  }
  if (duePaise <= 0) return 'Nothing is due to this consultant on this placement.';
  if (amountPaise > duePaise) return `Amount is more than the amount due (${formatPaise(duePaise)}).`;
  return null;
}

export interface PayoutRowAmounts {
  amountPaise: number;
  platformPaise: number;
  gstPaise: number;
  consultantPaise: number;
  paidOutPaise: number;
  duePaise: number;
}

/** Totals for the admin tracker: what employers paid, TRICCI's share, and what consultants are owed. */
export function summarisePayouts(rows: PayoutRowAmounts[]) {
  const sum = (f: (r: PayoutRowAmounts) => number) => rows.reduce((s, r) => s + f(r), 0);
  return {
    receivedPaise: sum(r => r.amountPaise),
    tricciPaise: sum(r => r.platformPaise),
    gstPaise: sum(r => r.gstPaise),
    consultantPaise: sum(r => r.consultantPaise),
    paidOutPaise: sum(r => r.paidOutPaise),
    duePaise: sum(r => r.duePaise),
  };
}
