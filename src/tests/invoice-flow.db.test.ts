/**
 * End-to-end invoice flow against a LOCAL test database. Calls the real route handlers.
 * Only runs with RUN_DB_TESTS=1 and a DATABASE_URL pointing at a local tricci_test database.
 * Auth, email, Razorpay and org permissions are stubbed; everything else is real.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createHmac } from 'crypto';

const DB_URL = process.env.DATABASE_URL ?? '';
const LOCAL = /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1):\d+\/tricci_test$/.test(DB_URL);

let session: { user: { id: string; role: string; email: string; name: string } } | null = null;
const sent: Array<{ to: string; subject: string }> = [];
let orderSeq = 0;

vi.mock('@/lib/auth/auth.js', () => ({
  getAuth: () => ({ api: { getSession: async () => session } }),
}));
vi.mock('@/lib/auth/express-adapter.js', () => ({
  toWebRequest: () => ({ headers: new Headers() }),
}));
vi.mock('@/server/lib/orgPermissions.js', () => ({
  getOrgRole: async () => 'owner',
  canManageBilling: () => true,
}));
vi.mock('@/server/email.js', () => ({
  sendEmail: async (m: { to: string; subject: string }) => { sent.push({ to: m.to, subject: m.subject }); return { ok: true }; },
}));
vi.mock('@/server/lib/razorpayClient.js', () => ({
  getRazorpay: () => ({
    key_id: 'rzp_test_key',
    client: { orders: { create: async ({ amount }: { amount: number }) => ({ id: `order_test_${++orderSeq}`, amount, currency: 'INR' }) } },
  }),
}));

const KEY_SECRET = 'test_key_secret';
const WEBHOOK_SECRET = 'test_webhook_secret';

type Res = { code: number; body: any };
function call(handler: (req: any, res: any) => Promise<any>, req: { params?: Record<string, string>; body?: any; headers?: Record<string, string> }): Promise<Res> {
  return new Promise(async (resolve) => {
    const out: Res = { code: 200, body: undefined };
    const res: any = {
      status(c: number) { out.code = c; return res; },
      json(b: any) { out.body = b; resolve(out); return res; },
      set() { return res; },
    };
    await handler({ params: req.params ?? {}, body: req.body ?? {}, query: {}, headers: req.headers ?? {} }, res);
    resolve(out);
  });
}

describe.runIf(LOCAL)('invoice flow (local DB)', () => {
  let db: any; let schema: any; let sql: any;
  const ids = { admin: 'u_admin', employer: 'u_employer', consultant: 'u_consult' };
  let placementId: number; let placement2Id: number;
  let h: Record<string, (req: any, res: any) => Promise<any>>;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    db = (await import('@/server/db/client.js')).db;
    schema = await import('@/server/db/schema.js');
    sql = (await import('drizzle-orm')).sql;
    // Fresh state each run
    await db.execute(sql`TRUNCATE invoice_message, consultant_transfer, invoice_payment, consultant_invoice, notification, placement, job, "user" RESTART IDENTITY CASCADE`);
    const users = [
      { id: ids.admin, name: 'TRICCI Admin', email: 'admin@test.local', role: 'admin' },
      { id: ids.employer, name: 'Test Employer', email: 'employer@test.local', role: 'employer' },
      { id: ids.consultant, name: 'Test Consultant', email: 'consultant@test.local', role: 'consultant' },
    ];
    for (const u of users) await db.insert(schema.user).values({ ...u, emailVerified: true });
    await db.insert(schema.job).values({
      id: 'job_test_1', title: 'Backend Engineer', company: 'Acme', department: 'Eng', location: 'Mumbai',
      ctcMin: 1200000, ctcMax: 1200000, ctcLabel: '12 LPA', experience: '3-5', category: 'Tech',
      skills: [], description: 'd', responsibilities: [], requirements: [], employerUserId: ids.employer,
    } as any);
    const mk = async (candidate: string) => {
      const [p] = await db.insert(schema.placement).values({
        jobTitle: 'Backend Engineer', companyName: 'Acme', candidateName: candidate, candidateEmail: `${candidate.toLowerCase()}@test.local`,
        jobId: 'job_test_1', employerUserId: ids.employer, consultantUserId: ids.consultant,
        ctcLpa: 12, offerCtcLpa: 12, feePercent: 15, feeAmountRupees: 180000,
      } as any).returning({ id: schema.placement.id });
      return p.id as number;
    };
    placementId = await mk('Asha');
    placement2Id = await mk('Ravi');
    // Invoice for placement 1: fee 1.8 LPA, 20% platform, 80% consultant, no GST yet
    await db.insert(schema.consultantInvoice).values({
      placementId, consultantUserId: ids.consultant, status: 'submitted', gstEnabled: false, gstRatePct: 18,
      offerCtcLpa: 12, feeAmountLpa: 1.8, platformAmountLpa: 0.36, consultantAmountLpa: 1.44,
      gstAmountLpa: 0, totalAmountLpa: 1.8, invoiceNumber: 'INV-1', submittedAt: new Date(),
    } as any);
    // Invoice for placement 2 for the webhook test
    await db.insert(schema.consultantInvoice).values({
      placementId: placement2Id, consultantUserId: ids.consultant, status: 'submitted', gstEnabled: false, gstRatePct: 18,
      offerCtcLpa: 12, feeAmountLpa: 1.8, platformAmountLpa: 0.36, consultantAmountLpa: 1.44,
      gstAmountLpa: 0, totalAmountLpa: 1.8, invoiceNumber: 'INV-2', submittedAt: new Date(),
    } as any);

    h = {
      adminApprove: (await import('@/server/api/admin/invoices/[placementId]/approve/POST.js')).default,
      adminSendBack: (await import('@/server/api/admin/invoices/[placementId]/send-back/POST.js')).default,
      adminGst: (await import('@/server/api/admin/invoices/[placementId]/gst/POST.js')).default,
      adminSendEmployer: (await import('@/server/api/admin/invoices/[placementId]/send-to-employer/POST.js')).default,
      threadGet: (await import('@/server/api/invoices/[placementId]/thread/GET.js')).default,
      threadPost: (await import('@/server/api/invoices/[placementId]/thread/POST.js')).default,
      employerApprove: (await import('@/server/api/employer/invoices/[placementId]/approve/POST.js')).default,
      pay: (await import('@/server/api/employer/placements/[id]/invoice/pay/POST.js')).default,
      verify: (await import('@/server/api/employer/placements/[id]/invoice/verify-payment/POST.js')).default,
      webhook: (await import('@/server/api/payments/invoice-webhook/POST.js')).default,
      payoutsGet: (await import('@/server/api/admin/payouts/GET.js')).default,
      payoutRecord: (await import('@/server/api/admin/payouts/[placementId]/record/POST.js')).default,
    };
  });

  afterAll(async () => {
    await db.execute(sql`TRUNCATE invoice_message, consultant_transfer, invoice_payment, consultant_invoice, notification, placement, job, "user" RESTART IDENTITY CASCADE`);
  });

  const as = (role: 'admin' | 'employer' | 'consultant') => {
    const id = ids[role];
    session = { user: { id, role, email: `${role}@test.local`, name: role } };
  };
  const status = async (pid: number) => (await db.select().from(schema.consultantInvoice).where(sql`placement_id = ${pid}`))[0]?.status;

  it('admin turns GST on and the total updates (fee x 18%)', async () => {
    as('admin');
    const r = await call(h.adminGst, { params: { placementId: String(placementId) }, body: { gstEnabled: true } });
    expect(r.code).toBe(200);
    expect(r.body.gstAmountLpa).toBeCloseTo(0.324, 6);
    expect(r.body.totalAmountLpa).toBeCloseTo(2.124, 6);
  });

  it('admin approves, then sends to employer; GST can no longer change after that', async () => {
    as('admin');
    expect((await call(h.adminApprove, { params: { placementId: String(placementId) } })).code).toBe(200);
    expect((await call(h.adminSendEmployer, { params: { placementId: String(placementId) } })).code).toBe(200);
    expect(await status(placementId)).toBe('sent_to_employer');
    const r = await call(h.adminGst, { params: { placementId: String(placementId) }, body: { gstEnabled: false } });
    expect(r.code).toBe(409);
  });

  it('employer can ask for a change; consultant replies and the invoice returns to sent_back', async () => {
    as('employer');
    const q = await call(h.threadPost, { params: { placementId: String(placementId) }, body: { message: 'Please check the GST amount', raiseQuery: true } });
    expect(q.code).toBe(200);
    expect(await status(placementId)).toBe('sent_back');
    as('consultant');
    const bad = await call(h.threadPost, { params: { placementId: String(placementId) }, body: { message: 'Trying to raise a query', raiseQuery: true } });
    expect(bad.code).toBe(403);
    const reply = await call(h.threadPost, { params: { placementId: String(placementId) }, body: { message: 'Fixed the GST, please review' } });
    expect(reply.code).toBe(200);
    const thread = await call(h.threadGet, { params: { placementId: String(placementId) } });
    expect(thread.body.messages.map((m: any) => m.kind)).toEqual(['query', 'reply']);
  });

  it('consultant resubmits, admin re-approves and sends; employer approves; a second approve is refused', async () => {
    as('consultant');
    await db.update(schema.consultantInvoice).set({ status: 'submitted' }).where(sql`placement_id = ${placementId}`);
    as('admin');
    await call(h.adminApprove, { params: { placementId: String(placementId) } });
    await call(h.adminSendEmployer, { params: { placementId: String(placementId) } });
    as('employer');
    expect((await call(h.employerApprove, { params: { placementId: String(placementId) } })).code).toBe(200);
    expect(await status(placementId)).toBe('employer_approved');
    expect((await call(h.employerApprove, { params: { placementId: String(placementId) } })).code).toBe(409);
  });

  it('employer pays: order amount is the invoice total in paise, then the browser verify marks it paid once', async () => {
    as('employer');
    const order = await call(h.pay, { params: { id: String(placementId) } });
    expect(order.code).toBe(200);
    expect(order.body.amount).toBe(21_240_000); // 2.124 LPA x 1,00,00,000 paise
    const oid = order.body.order_id as string;
    const pid = 'pay_test_1';
    const sig = createHmac('sha256', KEY_SECRET).update(`${oid}|${pid}`).digest('hex');
    const bad = await call(h.verify, { params: { id: String(placementId) }, body: { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: 'nope' } });
    expect(bad.code).toBe(400);
    const ok = await call(h.verify, { params: { id: String(placementId) }, body: { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } });
    expect(ok.body.success).toBe(true);
    expect(await status(placementId)).toBe('paid');
    const again = await call(h.verify, { params: { id: String(placementId) }, body: { razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } });
    expect(again.body.already_processed).toBe(true);
    // a paid invoice cannot be paid again
    expect((await call(h.pay, { params: { id: String(placementId) } })).code).toBe(409);
  });

  it('admin was emailed the split when the employer paid (sent once)', () => {
    const adminMails = sent.filter(m => m.to === 'admin@test.local' && m.subject.startsWith('Employer paid'));
    expect(adminMails.length).toBe(1);
  });

  it('webhook: valid payment.captured marks paid; replay does nothing; bad signature is rejected', async () => {
    as('employer');
    const order = await call(h.pay, { params: { id: String(placement2Id) } }).catch(() => null);
    // placement2 is still submitted, so pay must be refused until it reaches employer_approved
    expect(order?.code).toBe(409);
    await db.update(schema.consultantInvoice).set({ status: 'employer_approved' }).where(sql`placement_id = ${placement2Id}`);
    const o = await call(h.pay, { params: { id: String(placement2Id) } });
    const oid = o.body.order_id as string;
    // placement 2 has no GST, so the order is 1.8 LPA = 18,000,000 paise
    const mkBody = (amount: number) => Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_wh_1', order_id: oid, amount } } } }));
    const body = mkBody(18_000_000);
    const goodSig = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
    const badRes = await call(h.webhook, { body, headers: { 'x-razorpay-signature': 'deadbeef' } });
    expect(badRes.code).toBe(400);
    // wrong amount: accepted by the signature check, but the invoice must stay unpaid
    const wrong = mkBody(17_999_999);
    const wrongSig = createHmac('sha256', WEBHOOK_SECRET).update(wrong).digest('hex');
    expect((await call(h.webhook, { body: wrong, headers: { 'x-razorpay-signature': wrongSig } })).code).toBe(200);
    expect(await status(placement2Id)).toBe('employer_approved');
    const r1 = await call(h.webhook, { body, headers: { 'x-razorpay-signature': goodSig } });
    expect(r1.code).toBe(200);
    expect(await status(placement2Id)).toBe('paid');
    const r2 = await call(h.webhook, { body, headers: { 'x-razorpay-signature': goodSig } });
    expect(r2.code).toBe(200);
    const paidCount = sent.filter(m => m.to === 'admin@test.local' && m.subject.includes('Ravi')).length;
    expect(paidCount).toBe(1);
  });

  it('payouts: tracker shows TRICCI share and due; recording enforces the caps and sends the receipt', async () => {
    as('admin');
    const list = await call(h.payoutsGet, {});
    expect(list.code).toBe(200);
    const row = list.body.payouts.find((p: any) => p.placementId === placementId);
    expect(row.platformPaise).toBe(3_600_000);
    expect(row.consultantPaise).toBe(14_400_000);
    expect(row.duePaise).toBe(14_400_000);
    expect(row.gstDuePaise).toBe(3_240_000);

    const over = await call(h.payoutRecord, { params: { placementId: String(placementId) }, body: { amountPaise: 14_400_001, gstPaise: 0, reference: 'UTR-OVER' } });
    expect(over.code).toBe(400);
    const gstOver = await call(h.payoutRecord, { params: { placementId: String(placementId) }, body: { amountPaise: 1_000_000, gstPaise: 3_240_001, reference: 'UTR-GST' } });
    expect(gstOver.code).toBe(400);

    const ok = await call(h.payoutRecord, { params: { placementId: String(placementId) }, body: { amountPaise: 10_000_000, gstPaise: 3_240_000, reference: 'UTR123456' } });
    expect(ok.code).toBe(200);
    expect(ok.body.remainingDuePaise).toBe(4_400_000);
    expect(ok.body.remainingGstDuePaise).toBe(0);

    // The receipt is sent in the background after the response, so wait for it.
    let receipt: { to: string; subject: string } | undefined;
    for (let i = 0; i < 40 && !receipt; i++) {
      receipt = sent.find(m => m.to === 'consultant@test.local' && m.subject.startsWith('Payment receipt'));
      if (!receipt) await new Promise(r => setTimeout(r, 100));
    }
    expect(receipt).toBeDefined();

    const rest = await call(h.payoutRecord, { params: { placementId: String(placementId) }, body: { amountPaise: 4_400_000, gstPaise: 0, reference: 'UTR-REST' } });
    expect(rest.code).toBe(200);
    const after = await call(h.payoutRecord, { params: { placementId: String(placementId) }, body: { amountPaise: 1, gstPaise: 0, reference: 'UTR-EXTRA' } });
    expect(after.code).toBe(400);
  });
});
