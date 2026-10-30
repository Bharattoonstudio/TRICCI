/**
 * Manual consultant payout bookkeeping (pure, no DB or money movement).
 * Flow: employer pays TRICCI -> TRICCI pays the consultant by bank/UPI -> admin records
 * each transfer here. A transfer = consultant share (base) + optional GST on that share.
 * Recording never sends money.
 */

export function consultantDuePaise(consultantPaise: number, basePaidPaise: number): number {
  return Math.max(0, consultantPaise - basePaidPaise);
}

export function gstDuePaise(gstPaise: number, gstPaidPaise: number): number {
  return Math.max(0, gstPaise - gstPaidPaise);
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

/** Returns an error message for the admin, or null when the transfer may be recorded. */
export function validateTransfer(
  input: { amountPaise: unknown; gstPaise: unknown; reference: unknown },
  baseDuePaise: number,
  gstDue: number,
): string | null {
  const { amountPaise, gstPaise, reference } = input;
  if (typeof amountPaise !== 'number' || !Number.isInteger(amountPaise) || amountPaise <= 0) {
    return 'Amount must be a positive whole number of paise.';
  }
  const gst = gstPaise === undefined || gstPaise === null ? 0 : gstPaise;
  if (typeof gst !== 'number' || !Number.isInteger(gst) || gst < 0) {
    return 'GST must be zero or a positive whole number of paise.';
  }
  if (typeof reference !== 'string' || reference.trim().length < 3 || reference.trim().length > 128) {
    return 'Enter the bank or UPI reference (3 to 128 characters).';
  }
  if (baseDuePaise <= 0) return 'Nothing is due to this consultant on this placement.';
  if (amountPaise > baseDuePaise) return `Amount is more than the amount due (${formatPaise(baseDuePaise)}).`;
  if (gst > gstDue) return `GST is more than the GST due (${formatPaise(gstDue)}).`;
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
