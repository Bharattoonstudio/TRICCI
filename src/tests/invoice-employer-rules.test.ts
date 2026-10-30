import { describe, it, expect } from 'vitest';
import { canEmployerRespond, canPay, canEditGst, canConsultantEdit } from '../server/lib/invoiceStatus';

describe('employer approval flow', () => {
  it('employer can approve or query only while the invoice is with them', () => {
    expect(canEmployerRespond('sent_to_employer')).toBe(true);
    expect(canEmployerRespond('employer_approved')).toBe(false);
    expect(canEmployerRespond('sent_back')).toBe(false);
  });
  it('payment needs the employer approval first', () => {
    expect(canPay('employer_approved')).toBe(true);
    expect(canPay('sent_to_employer')).toBe(false);
    expect(canPay('paid')).toBe(false);
  });
  it('after a query the consultant can edit and resubmit; after approval they cannot', () => {
    expect(canConsultantEdit('sent_back')).toBe(true);
    expect(canConsultantEdit('employer_approved')).toBe(false);
    expect(canEditGst('employer_approved')).toBe(false);
  });
});
