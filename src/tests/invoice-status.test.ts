import { describe, it, expect } from 'vitest';
import { canConsultantEdit, canApprove, canSendBack, canSendToEmployer } from '../server/lib/invoiceStatus';

describe('consultant invoice status rules', () => {
  it('lets the consultant edit only a new, draft or sent-back invoice', () => {
    expect(canConsultantEdit(null)).toBe(true);
    expect(canConsultantEdit('draft')).toBe(true);
    expect(canConsultantEdit('sent_back')).toBe(true);
    expect(canConsultantEdit('submitted')).toBe(false);
    expect(canConsultantEdit('approved')).toBe(false);
    expect(canConsultantEdit('sent_to_employer')).toBe(false);
  });

  it('approves only a submitted invoice', () => {
    expect(canApprove('submitted')).toBe(true);
    expect(canApprove('draft')).toBe(false);
    expect(canApprove('approved')).toBe(false);
  });

  it('sends back a submitted or approved invoice, not one already sent on', () => {
    expect(canSendBack('submitted')).toBe(true);
    expect(canSendBack('approved')).toBe(true);
    expect(canSendBack('sent_to_employer')).toBe(false);
    expect(canSendBack('draft')).toBe(false);
  });

  it('sends to employer only after approval', () => {
    expect(canSendToEmployer('approved')).toBe(true);
    expect(canSendToEmployer('submitted')).toBe(false);
    expect(canSendToEmployer('sent_back')).toBe(false);
  });
});
