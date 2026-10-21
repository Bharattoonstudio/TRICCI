/**
 * Consultant invoice status rules (pure logic, shared by routes and tests).
 * Flow: draft -> submitted -> approved -> sent_to_employer.
 * Admin may send a submitted or approved invoice back (sent_back); the consultant
 * edits and resubmits, which returns it to submitted.
 */
export type InvoiceStatus = 'draft' | 'submitted' | 'approved' | 'sent_back' | 'sent_to_employer';

/** The consultant may generate, save and submit only in these states. */
export function canConsultantEdit(status: InvoiceStatus | null): boolean {
  return status === null || status === 'draft' || status === 'sent_back';
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
