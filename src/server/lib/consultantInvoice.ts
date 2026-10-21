/**
 * Consultant invoice amounts (pure logic, no DB).
 *
 * Invoice = placement fee (before GST) + GST on that fee, when the consultant
 * has GST turned on. The fee is split by placementFeeForOffer: the platform keeps
 * 20%, the consultant gets 80%. The GST is passed to the consultant.
 *
 * The GST rate is an input, not a fixed rule. Your CA must confirm the rate.
 */
import { placementFeeForOffer, RUPEES_PER_LPA, type EmployerFee } from './employerFee.js';

export const DEFAULT_GST_RATE_PCT = 18;

export interface InvoiceAmounts {
  feeAmountLpa: number;
  platformAmountLpa: number;
  consultantAmountLpa: number;
  gstAmountLpa: number;
  totalAmountLpa: number;
  platformSharePct: number;
  consultantSharePct: number;
}

export function computeInvoiceAmounts(input: {
  fee: EmployerFee;
  offerCtcLpa: number;
  consultantSharePct: number;
  gstEnabled: boolean;
  gstRatePct?: number;
}): InvoiceAmounts {
  const split = placementFeeForOffer(input.fee, input.offerCtcLpa, true, input.consultantSharePct);
  const feeAmountLpa = split.feeAmountLpa;
  const consultantAmountLpa = split.consultantFeeAmountLpa;
  const platformAmountLpa = feeAmountLpa - consultantAmountLpa;
  const rate = input.gstRatePct ?? DEFAULT_GST_RATE_PCT;
  const gstAmountLpa = input.gstEnabled ? (feeAmountLpa * rate) / 100 : 0;
  return {
    feeAmountLpa,
    platformAmountLpa,
    consultantAmountLpa,
    gstAmountLpa,
    totalAmountLpa: feeAmountLpa + gstAmountLpa,
    platformSharePct: 100 - input.consultantSharePct,
    consultantSharePct: input.consultantSharePct,
  };
}

export function lpaToRupees(lpa: number): number {
  return Math.round(lpa * RUPEES_PER_LPA);
}
