/**
 * GST that the employer pays on top of the placement fee (pure, no DB).
 * GST = fee × rate / 100, only when the admin turns collection on. Total = fee + GST.
 */
export const DEFAULT_GST_RATE_PCT = 18;

export function gstForFee(feeLpa: number, rate: number, enabled: boolean) {
  const gstLpa = enabled ? (feeLpa * rate) / 100 : 0;
  return { gstAmountLpa: gstLpa, totalAmountLpa: feeLpa + gstLpa };
}
