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
/** Platform keeps this share of the employer's fee. The consultant gets the rest. */
export const PLATFORM_SHARE_PCT = 20;

/** Consultant share of the placement fee. Every consultant gets 80% unless Pro is live. */
export const CONSULTANT_SHARE_PCT_FREE = 80;
export const CONSULTANT_SHARE_PCT_PRO = 85;

/**
 * Pro plan switch. Stays false until Pro billing is live: until then every
 * consultant, including those on the 'pro' plan value, gets the 80% share.
 */
export const PRO_PLAN_ACTIVE = false;

/**
 * Agreement version that adds the Pro plan clause. A consultant gets the Pro
 * share only after accepting this version or a later one.
 */
export const PRO_PLAN_MIN_AGREEMENT_VERSION = '1.3';

/** True when `version` ("major.minor") is at least `min`. Missing versions are not accepted. */
export function isAgreementAtLeast(version: string | null | undefined, min: string): boolean {
  if (!version) return false;
  const parse = (v: string) => v.split('.').map(n => parseInt(n, 10));
  const [a, b] = parse(version);
  const [c, d] = parse(min);
  if ([a, b, c, d].some(n => Number.isNaN(n))) return false;
  return a > c || (a === c && b >= d);
}

export function consultantSharePctForPlan(
  plan: string | null | undefined,
  agreementVersion?: string | null,
  proActive: boolean = PRO_PLAN_ACTIVE,
): number {
  if (plan === 'pro' && proActive && isAgreementAtLeast(agreementVersion, PRO_PLAN_MIN_AGREEMENT_VERSION)) {
    return CONSULTANT_SHARE_PCT_PRO;
  }
  return CONSULTANT_SHARE_PCT_FREE;
}

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
 * Consultant split: the platform keeps its share (20% of the placement fee)
 * and the consultant gets the rest of the fee.
 */
export function placementFeeForOffer(
  fee: EmployerFee,
  offerCtcLpa: number,
  hasConsultant: boolean,
  consultantSharePct: number = CONSULTANT_SHARE_PCT_FREE,
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

  // Platform keeps its share of the fee; the consultant gets the rest.
  const platformSharePct = 100 - consultantSharePct;
  const platformAmountLpa = feeAmountLpa * (platformSharePct / 100);
  const consultantFeeAmountLpa = feeAmountLpa - platformAmountLpa;
  const consultantFeePercent = offerCtcLpa > 0 ? (consultantFeeAmountLpa / offerCtcLpa) * 100 : 0;
  return {
    feePercent,
    feeAmountLpa,
    platformFeePercent: offerCtcLpa > 0 ? (platformAmountLpa / offerCtcLpa) * 100 : 0,
    consultantFeePercent,
    consultantFeeAmountLpa,
  };
}

/**
 * What the consultant sees for a job, based on the employer's fee.
 * Percentage job: consultant share is 80% of the percentage (10% → 8%).
 * Fixed-amount job: consultant share is 80% of the amount (₹1,00,000 → ₹80,000).
 */
export function consultantShareFor(fee: EmployerFee): {
  consultantFeePercent: number | null;
  consultantFeeAmountRupees: number | null;
  consultantFeeLabel: string;
} {
  const consultantSharePct = 100 - PLATFORM_SHARE_PCT;
  if (fee.feeType === 'amount') {
    const amount = Math.round(((fee.feeAmountRupees ?? 0) * consultantSharePct) / 100);
    return {
      consultantFeePercent: null,
      consultantFeeAmountRupees: amount,
      consultantFeeLabel: `${formatRupees(amount)} fixed`,
    };
  }
  const pct = Math.round(fee.feePercent * consultantSharePct) / 100;
  return {
    consultantFeePercent: pct,
    consultantFeeAmountRupees: null,
    consultantFeeLabel: `${pct}% of CTC`,
  };
}

/** Short label for showing a job's fee, e.g. "8% of offer CTC" or "₹75,000 fixed fee". */
export function formatFeeLabel(fee: { feeType?: string | null; feePercent: number; feeAmountRupees?: number | null }): string {
  if (fee.feeType === 'amount' && fee.feeAmountRupees != null) {
    return `${formatRupees(fee.feeAmountRupees)} fixed fee`;
  }
  return `${fee.feePercent}% of offer CTC`;
}
