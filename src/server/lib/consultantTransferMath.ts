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
