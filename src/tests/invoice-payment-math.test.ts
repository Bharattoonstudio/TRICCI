import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { lpaToPaise, invoiceSplitPaise, verifyPaymentSignature, verifyWebhookSignature } from '../server/lib/invoicePaymentMath';

describe('lpaToPaise', () => {
  it('converts LPA to paise (1 LPA = 1,00,00,000 paise)', () => {
    expect(lpaToPaise(1)).toBe(10_000_000);
    expect(lpaToPaise(12)).toBe(120_000_000);
  });
});

describe('invoiceSplitPaise', () => {
  it('splits 20% platform / 80% consultant on the pre-GST fee, and GST on top', () => {
    // 12 LPA CTC x 15% fee = 1.8 LPA; with 18% GST total = 2.124 LPA
    const s = invoiceSplitPaise({ feeLpa: 1.8, platformLpa: 0.36, totalLpa: 2.124 });
    expect(s.platformPaise).toBe(3_600_000);
    expect(s.consultantPaise).toBe(14_400_000);
    expect(s.feePaise).toBe(18_000_000);
    expect(s.gstPaise).toBe(3_240_000);
    expect(s.totalPaise).toBe(21_240_000);
  });

  it('always adds up: platform + consultant = fee, fee + GST = total', () => {
    const s = invoiceSplitPaise({ feeLpa: 0.7777, platformLpa: 0.15554, totalLpa: 0.917486 });
    expect(s.platformPaise + s.consultantPaise).toBe(s.feePaise);
    expect(s.feePaise + s.gstPaise).toBe(s.totalPaise);
  });
});

describe('signature checks', () => {
  const secret = 'test_key_secret';
  it('accepts a correct checkout signature and rejects a wrong one', () => {
    const sig = createHmac('sha256', secret).update('order_1|pay_1').digest('hex');
    expect(verifyPaymentSignature('order_1', 'pay_1', sig, secret)).toBe(true);
    expect(verifyPaymentSignature('order_1', 'pay_2', sig, secret)).toBe(false);
    expect(verifyPaymentSignature('order_1', 'pay_1', sig, 'other')).toBe(false);
  });

  it('checks webhook signatures over the raw body', () => {
    const body = Buffer.from('{"event":"payment.captured"}');
    const sig = createHmac('sha256', 'whsec').update(body).digest('hex');
    expect(verifyWebhookSignature(body, sig, 'whsec')).toBe(true);
    expect(verifyWebhookSignature(Buffer.from('{"event":"tampered"}'), sig, 'whsec')).toBe(false);
    expect(verifyWebhookSignature(body, 'short', 'whsec')).toBe(false);
  });
});
