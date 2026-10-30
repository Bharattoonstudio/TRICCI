/**
 * Consultant invoice status rules (pure logic, shared by routes and tests).
 * Flow: draft -> submitted -> approved -> sent_to_employer -> paid (employer paid via Razorpay).
 * Admin may send a submitted or approved invoice back (sent_back); the consultant
 * edits and resubmits, which returns it to submitted.
 */
export type InvoiceStatus = 'draft' | 'submitted' | 'approved' | 'sent_back' | 'sent_to_employer' | 'employer_approved' | 'paid';

/** The consultant may generate, save and submit only in these states. */
export function canConsultantEdit(status: InvoiceStatus | null): boolean {
  return status === null || status === 'draft' || status === 'sent_back';
}

/** Employer can approve or raise a query only while the invoice is with them. */
export function canEmployerRespond(status: InvoiceStatus | null): boolean {
  return status === 'sent_to_employer';
}

/** Payment needs the employer's approval first. */
export function canPay(status: InvoiceStatus | null): boolean {
  return status === 'employer_approved';
}

/** Admin may turn GST collection on or off until the invoice has gone to the employer. */
export function canEditGst(status: InvoiceStatus | null): boolean {
  return status === 'submitted' || status === 'approved' || status === 'sent_back';
}

export function canApprove(status: InvoiceStatus | null): boolean {
  return status === 'submitted';
}

export function canSendBack(status: InvoiceStatus | null): boolean {
  return status === 'submitted' || status === 'approved';
}

export function canSendToEmployer(status: InvoiceStatus | null): boolean {
  return status === 'approved';
}
