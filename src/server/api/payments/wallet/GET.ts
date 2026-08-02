/**
 * GET /api/payments/wallet
 * Returns the employer's wallet balance and last 20 transactions.
 *
 * FIX: was using MySQL-style `?` placeholders and mysql2 array-destructure
 * result format against a `pg` (Postgres) pool — pg uses `$1, $2...` and
 * returns `{ rows }`, so this endpoint's queries didn't match Postgres
 * syntax and were very likely failing on every call. Fixed to use pg's API.
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

    const balResult = await pool.query(
      `SELECT COALESCE(SUM(amount_paise), 0) AS total FROM wallet_transaction WHERE employer_user_id = $1 AND status = 'paid'`,
      [userId],
    );
    const balance_paise = Number(balResult.rows[0]?.total ?? 0);

    const txResult = await pool.query(
      `SELECT id, razorpay_order_id, razorpay_payment_id, amount_paise, currency, status, receipt, created_at
       FROM wallet_transaction WHERE employer_user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId],
    );

    res.json({ balance_paise, balance_rupees: balance_paise / 100, transactions: txResult.rows });
  } catch (err) {
    console.error('[payments.wallet] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
}
