/**
 * Employer placement fee options.
 *
 * An employer sets the fee on a job in one of two ways:
 *  - 'percent': a percentage of the offer CTC (5% to 35% by default)
 *  - 'amount':  a fixed rupee fee (minimum ₹50,000, no maximum)
 *
 * Pure functions only — no database import — so the rules can be unit tested
 * without touching live data.
 */

export const RUPEES_PER_LPA = 100000;
export const FEE_PERCENT_MIN = 5;
export const FEE_PERCENT_MAX = 35;
export const FEE_AMOUNT_MIN_RUPEES = 50000;

export type FeeType = 'percent' | 'amount';

export interface FeeLimits {
  percentMin: number;
  percentMax: number;
  amountMin: number;
}

export const DEFAULT_FEE_LIMITS: FeeLimits = {
  percentMin: FEE_PERCENT_MIN,
  percentMax: FEE_PERCENT_MAX,
  amountMin: FEE_AMOUNT_MIN_RUPEES,
};

export interface EmployerFee {
  feeType: FeeType;
  /** Percentage of offer CTC. Stored as 0 for amount-based fees. */
  feePercent: number;
  /** Fixed fee in rupees. Null for percentage-based fees. */
  feeAmountRupees: number | null;
}

export type FeeValidation = { ok: true; fee: EmployerFee } | { ok: false; error: string };

function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

/**
 * Validate the fee an employer submitted for a job.
 * Rejects anything outside the limits instead of silently clamping it.
 */
export function validateEmployerFee(
  input: { feeType?: unknown; feePercent?: unknown; feeAmountRupees?: unknown },
  limits: FeeLimits = DEFAULT_FEE_LIMITS,
): FeeValidation {
  if (input.feeType === 'amount') {
    const amount = Number(input.feeAmountRupees);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'Enter the placement fee amount in rupees' };
    }
    const rounded = Math.round(amount);
    if (rounded < limits.amountMin) {
      return { ok: false, error: `The fixed fee must be at least ${formatRupees(limits.amountMin)}` };
    }
    return { ok: true, fee: { feeType: 'amount', feePercent: 0, feeAmountRupees: rounded } };
  }

  if (input.feeType !== undefined && input.feeType !== 'percent') {
    return { ok: false, error: 'feeType must be "percent" or "amount"' };
  }
  const pct = Number(input.feePercent);
  if (!Number.isFinite(pct) || pct < limits.percentMin || pct > limits.percentMax) {
    return { ok: false, error: `The fee percentage must be between ${limits.percentMin}% and ${limits.percentMax}%` };
  }
  return { ok: true, fee: { feeType: 'percent', feePercent: pct, feeAmountRupees: null } };
}

/**
 * Work out the placement fee once an offer CTC is known.
 * Percentage fees are applied to the offer CTC; amount fees are used as they are.
 * Consultant split: the platform keeps its margin (platformFeePct of offer CTC)
 * and the consultant gets the rest of the fee.
 */
export function placementFeeForOffer(
  fee: EmployerFee,
  offerCtcLpa: number,
  platformFeePct: number,
  hasConsultant: boolean,
): {
  feePercent: number;
  feeAmountLpa: number;
  platformFeePercent: number;
  consultantFeePercent: number;
  consultantFeeAmountLpa: number;
} {
  const feeAmountLpa = fee.feeType === 'amount'
    ? (fee.feeAmountRupees ?? 0) / RUPEES_PER_LPA
    : (offerCtcLpa * fee.feePercent) / 100;
  const feePercent = offerCtcLpa > 0 ? (feeAmountLpa / offerCtcLpa) * 100 : fee.feePercent;

  if (!hasConsultant) {
    return {
      feePercent,
      feeAmountLpa,
      platformFeePercent: feePercent,
      consultantFeePercent: 0,
      consultantFeeAmountLpa: 0,
    };
  }

  const platformAmountLpa = (offerCtcLpa * platformFeePct) / 100;
  const consultantFeeAmountLpa = Math.max(feeAmountLpa - platformAmountLpa, 0);
  const consultantFeePercent = offerCtcLpa > 0 ? (consultantFeeAmountLpa / offerCtcLpa) * 100 : 0;
  return {
    feePercent,
    feeAmountLpa,
    platformFeePercent: platformFeePct,
    consultantFeePercent,
    consultantFeeAmountLpa,
  };
}

/** Short label for showing a job's fee, e.g. "8% of offer CTC" or "₹75,000 fixed fee". */
export function formatFeeLabel(fee: { feeType?: string | null; feePercent: number; feeAmountRupees?: number | null }): string {
  if (fee.feeType === 'amount' && fee.feeAmountRupees != null) {
    return `${formatRupees(fee.feeAmountRupees)} fixed fee`;
  }
  return `${fee.feePercent}% of offer CTC`;
}
