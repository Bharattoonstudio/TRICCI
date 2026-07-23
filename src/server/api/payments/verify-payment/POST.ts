/**
 * POST /api/payments/verify-payment
 * Verifies Razorpay HMAC signature and marks the wallet transaction as paid.
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 * Returns: { success, credits_added_paise, new_balance_paise }
 */
import type { Request, Response } from 'express';
import { createHmac } from 'crypto';
import { pool } from '@/server/db/pool.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';

const ORANGE = '#E8470A';
const PURPLE = '#6B4FBB';
const BG = '#080808';
const CARD = '#111111';
const TEXT = '#f0f0f0';
const MUTED = '#888888';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required payment fields' });
    }

    // ── Signature verification ────────────────────────────────────────────────
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_secret || typeof key_secret !== 'string') {
      return res.status(500).json({ error: 'Payment configuration error' });
    }
    const expectedSig = createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      console.warn(`[payments.verify] SIGNATURE MISMATCH order=${razorpay_order_id}`);
      return res.status(400).json({ error: 'Payment verification failed. Please contact support.' });
    }

    // ── Fetch pending transaction ─────────────────────────────────────────────
    const [txRows] = await pool.query(
      `SELECT id, employer_user_id, amount_paise, status
       FROM wallet_transaction
       WHERE razorpay_order_id = ? AND employer_user_id = ?
       LIMIT 1`,
      [razorpay_order_id, session.user.id],
    ) as [Array<{ id: number; employer_user_id: string; amount_paise: number; status: string }>, unknown];

    const txn = txRows[0];
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.status === 'paid') return res.json({ success: true, already_processed: true });

    // ── Mark paid ─────────────────────────────────────────────────────────────
    await pool.query(
      `UPDATE wallet_transaction SET status = 'paid', razorpay_payment_id = ?, updated_at = NOW() WHERE id = ?`,
      [razorpay_payment_id, txn.id],
    );

    // ── New balance ───────────────────────────────────────────────────────────
    const [balRows] = await pool.query(
      `SELECT COALESCE(SUM(amount_paise), 0) AS total FROM wallet_transaction WHERE employer_user_id = ? AND status = 'paid'`,
      [session.user.id],
    ) as [Array<{ total: number }>, unknown];

    const newBalance = Number(balRows[0]?.total ?? 0);
    const amountRupees = (txn.amount_paise / 100).toLocaleString('en-IN');
    const balanceRupees = (newBalance / 100).toLocaleString('en-IN');

    console.log(`[payments.verify] PAID order=${razorpay_order_id} payment=${razorpay_payment_id} user=${session.user.id}`);

    // ── Confirmation email (non-blocking) ─────────────────────────────────────
    sendEmail({
      to: session.user.email,
      subject: `✅ ₹${amountRupees} credited to your TRICCI wallet`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:48px 16px 64px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
        <tr><td style="height:3px;background:linear-gradient(90deg,${ORANGE} 0%,${PURPLE} 100%);border-radius:3px 3px 0 0;"></td></tr>
        <tr><td style="background:${CARD};border-radius:0 0 20px 20px;border:1px solid #ffffff0d;border-top:none;padding:36px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:#22c55e;text-transform:uppercase;">✅ Payment Confirmed</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:${TEXT};">₹${amountRupees} added to your wallet</h1>
          <p style="margin:0 0 24px;font-size:15px;color:${MUTED};line-height:1.6;">Hi <strong style="color:${TEXT};">${session.user.name.split(' ')[0]}</strong>, your TRICCI wallet has been topped up.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#181818;border:1px solid #ffffff0f;border-radius:14px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 6px;font-size:13px;color:${TEXT};"><strong>Amount Paid:</strong> ₹${amountRupees}</p>
              <p style="margin:0 0 6px;font-size:13px;color:${TEXT};"><strong>New Balance:</strong> ₹${balanceRupees}</p>
              <p style="margin:0 0 6px;font-size:13px;color:${TEXT};"><strong>Payment ID:</strong> <span style="font-family:monospace;font-size:12px;color:${MUTED};">${razorpay_payment_id}</span></p>
              <p style="margin:0;font-size:13px;color:${TEXT};"><strong>Order ID:</strong> <span style="font-family:monospace;font-size:12px;color:${MUTED};">${razorpay_order_id}</span></p>
            </td></tr>
          </table>
          <a href="https://tricci.in/employer/dashboard" style="display:inline-block;background:linear-gradient(135deg,${ORANGE} 0%,${PURPLE} 100%);color:#ffffff;font-size:14px;font-weight:800;padding:14px 32px;border-radius:12px;text-decoration:none;">Go to Dashboard</a>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#444;">© 2025 TRICCI · <a href="https://tricci.in" style="color:#555;text-decoration:none;">tricci.in</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }).catch(e => console.error('[payments.verify] email error:', e));

    res.json({ success: true, credits_added_paise: txn.amount_paise, new_balance_paise: newBalance });
  } catch (err) {
    console.error('[payments.verify] ERROR:', err);
    res.status(500).json({ error: 'Payment verification failed. Please contact support.' });
  }
}
