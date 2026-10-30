/**
 * Payment emails.
 *  - notifyAdminsInvoicePaid: when an employer pays, every admin gets the breakdown.
 *  - sendConsultantReceipt: when you record a payout, the consultant gets a receipt.
 * Both are best-effort: a failed email is logged and never fails the payment or payout.
 */
import { db } from '../db/client.js';
import { invoicePayment, placement, user, consultantTransfer } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { sendEmail } from '../email.js';
import { formatPaise, consultantDuePaise, gstDuePaise } from './consultantTransferMath.js';

const ORANGE = '#E8470A';
const PURPLE = '#6B4FBB';
const BG = '#080808';
const CARD = '#111111';
const TEXT = '#f0f0f0';
const MUTED = '#888888';

const esc = (v: unknown) =>
  String(v ?? '—').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function rowsHtml(rows: Array<[string, string]>): string {
  return rows.map(([k, v]) =>
    `<tr><td style="padding:8px 0;font-size:13px;color:${MUTED};width:42%;vertical-align:top;">${esc(k)}</td>` +
    `<td style="padding:8px 0;font-size:13px;color:${TEXT};vertical-align:top;">${esc(v)}</td></tr>`).join('');
}

function shell(eyebrow: string, heading: string, intro: string, rows: Array<[string, string]>): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:48px 16px 64px;"><tr><td align="center">
<table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
<tr><td style="height:3px;background:linear-gradient(90deg,${ORANGE} 0%,${PURPLE} 100%);border-radius:3px 3px 0 0;"></td></tr>
<tr><td style="background:${CARD};border-radius:0 0 20px 20px;border:1px solid #ffffff0d;border-top:none;padding:36px;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#22c55e;text-transform:uppercase;">${esc(eyebrow)}</p>
<h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:${TEXT};">${esc(heading)}</h1>
<p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">${esc(intro)}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ffffff0f;">${rowsHtml(rows)}</table>
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center;"><p style="margin:0;font-size:12px;color:#444;">© 2025 TRICCI · <a href="https://tricci.in" style="color:#555;text-decoration:none;">tricci.in</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

async function loadPaidDetails(placementId: number) {
  const [row] = await db.select({
    amountPaise: invoicePayment.amountPaise,
    feePaise: invoicePayment.feePaise,
    platformPaise: invoicePayment.platformPaise,
    consultantPaise: invoicePayment.consultantPaise,
    gstPaise: invoicePayment.gstPaise,
    razorpayPaymentId: invoicePayment.razorpayPaymentId,
    paidAt: invoicePayment.paidAt,
    candidateName: placement.candidateName,
    jobTitle: placement.jobTitle,
    companyName: placement.companyName,
    employerUserId: placement.employerUserId,
    consultantUserId: placement.consultantUserId,
  })
    .from(invoicePayment)
    .innerJoin(placement, eq(invoicePayment.placementId, placement.id))
    .where(and(eq(invoicePayment.placementId, placementId), eq(invoicePayment.status, 'paid')))
    .limit(1);
  if (!row) return null;
  const [employer] = row.employerUserId
    ? await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.employerUserId)).limit(1)
    : [];
  const [consultant] = row.consultantUserId
    ? await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, row.consultantUserId)).limit(1)
    : [];
  return { ...row, employerName: employer?.name ?? null, consultantName: consultant?.name ?? null, consultantEmail: consultant?.email ?? null };
}

export async function notifyAdminsInvoicePaid(placementId: number): Promise<void> {
  try {
    const d = await loadPaidDetails(placementId);
    if (!d) return;
    const admins = await db.select({ email: user.email }).from(user).where(eq(user.role, 'admin'));
    if (admins.length === 0) return;

    const feeRupees = formatPaise(d.feePaise);
    const tricciPct = d.feePaise > 0 ? Math.round((d.platformPaise / d.feePaise) * 100) : 0;
    const subject = `Employer paid ${formatPaise(d.amountPaise)} · ${d.candidateName} · ${d.jobTitle}`;
    const html = shell(
      'Employer payment received',
      `${formatPaise(d.amountPaise)} received`,
      'An employer has paid a consultant invoice through the portal. The split is below.',
      [
        ['Role', d.jobTitle],
        ['Candidate', d.candidateName],
        ['Company (employer)', `${d.companyName}${d.employerName ? ` · ${d.employerName}` : ''}`],
        ['Consultant', d.consultantName ?? '—'],
        ['Placement fee (before GST)', feeRupees],
        ['TRICCI share', `${formatPaise(d.platformPaise)} (${tricciPct}% of fee)`],
        ['Consultant share', formatPaise(d.consultantPaise)],
        ['GST collected', formatPaise(d.gstPaise)],
        ['Total received', formatPaise(d.amountPaise)],
        ['Paid at', d.paidAt ? new Date(d.paidAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'],
        ['Razorpay payment ID', d.razorpayPaymentId ?? '—'],
      ],
    );
    await Promise.allSettled(admins.map(a => sendEmail({ to: a.email, subject, html })));
  } catch (err) {
    console.error('[invoice.email.admin] failed:', err);
  }
}

export async function sendConsultantReceipt(placementId: number, basePaise: number, gstPaise: number, reference: string): Promise<void> {
  try {
    const d = await loadPaidDetails(placementId);
    if (!d || !d.consultantEmail) return;
    const transfers = await db.select({ amountPaise: consultantTransfer.amountPaise, gstPaise: consultantTransfer.gstPaise })
      .from(consultantTransfer).where(eq(consultantTransfer.placementId, placementId));
    const gstPaidSoFar = transfers.reduce((s, t) => s + t.gstPaise, 0);
    const basePaidSoFar = transfers.reduce((s, t) => s + (t.amountPaise - t.gstPaise), 0);
    const remaining = consultantDuePaise(d.consultantPaise, basePaidSoFar);
    const gstRemaining = gstDuePaise(d.gstPaise, gstPaidSoFar);
    const totalNow = basePaise + gstPaise;
    const subject = `Payment receipt ${formatPaise(totalNow)} from TRICCI · ${d.jobTitle}`;
    const html = shell(
      'Payment receipt',
      `${formatPaise(totalNow)} paid to you`,
      `Hi ${d.consultantName ?? 'there'}, TRICCI has paid you for the placement below.`,
      [
        ['Candidate', d.candidateName],
        ['Role', d.jobTitle],
        ['Company', d.companyName],
        ['Consultant share paid now', formatPaise(basePaise)],
        ['GST paid now', gstPaise > 0 ? formatPaise(gstPaise) : 'Not included'],
        ['Total paid now', formatPaise(totalNow)],
        ['Bank / UPI reference', reference],
        ['Date', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })],
        ['Your total share for this placement', formatPaise(d.consultantPaise)],
        ['Consultant share paid to date', formatPaise(basePaidSoFar)],
        ['Consultant share still to be paid', formatPaise(remaining)],
        ['GST still to be paid', formatPaise(gstRemaining)],
      ],
    );
    await sendEmail({ to: d.consultantEmail, subject, html });
  } catch (err) {
    console.error('[payout.email.consultant] failed:', err);
  }
}
