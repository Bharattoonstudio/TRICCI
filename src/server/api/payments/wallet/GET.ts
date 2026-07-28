/**
 * GET /api/payments/wallet
 * Returns the employer's wallet balance and last 20 transactions.
 */
import type { Request, Response } from 'express';
import { pool } from '@/server/db/pool.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Employer access required' });
    }

    const userId = role === 'admin' && req.query.userId
      ? String(req.query.userId)
      : session.user.id;

    const [balRows] = await pool.query(
      `SELECT COALESCE(SUM(amount_paise), 0) AS total FROM wallet_transaction WHERE employer_user_id = ? AND status = 'paid'`,
      [userId],
    ) as [Array<{ total: number }>, unknown];

    const balance_paise = Number(balRows[0]?.total ?? 0);

    const [txRows] = await pool.query(
      `SELECT id, razorpay_order_id, razorpay_payment_id, amount_paise, currency, status, receipt, created_at
       FROM wallet_transaction WHERE employer_user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [userId],
    ) as [Array<{
      id: number; razorpay_order_id: string; razorpay_payment_id: string | null;
      amount_paise: number; currency: string; status: string; receipt: string | null; created_at: string;
    }>, unknown];

    res.json({ balance_paise, balance_rupees: balance_paise / 100, transactions: txRows });
  } catch (err) {
    console.error('[payments.wallet] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
}
