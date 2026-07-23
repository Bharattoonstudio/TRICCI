/**
 * POST /api/payments/create-order
 * Creates a Razorpay order for employer wallet top-up.
 * Body: { amount_paise: number }
 * Returns: { order_id, amount, currency, key_id }  */ import type { Request, Response } from 'express'; import Razorpay from 'razorpay'; import { pool } from '@/server/db/pool.js'; import { toWebRequest } from '@/lib/auth/express-adapter.js'; import { getAuth } from '@/lib/auth/auth.js';

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret || typeof key_id !== 'string' || typeof key_secret !== 'string') {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({ key_id, key_secret }); }

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Employer access required' });
    }

    const { amount_paise } = req.body as { amount_paise?: number };
    if (!amount_paise || typeof amount_paise !== 'number' || amount_paise < 100) {
      return res.status(400).json({ error: 'amount_paise must be ≥ 100 (minimum ₹1)' });
    }
    if (amount_paise > 5_000_000) {
      return res.status(400).json({ error: 'Maximum single deposit is ₹50,000' });
    }

    const receipt = `trc_${session.user.id.slice(0, 8)}_${Date.now()}`;
    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: amount_paise,
      currency: 'INR',
      receipt,
      notes: { userId: session.user.id, platform: 'TRICCI' },
    });

    await pool.query(
      `INSERT INTO wallet_transaction
         (employer_user_id, razorpay_order_id, amount_paise, currency, status, receipt)
       VALUES ($1, $2, $3, 'INR', 'created', $4)`,
      [session.user.id, order.id, amount_paise, receipt],
    );

    console.log(`[payments.create-order] order=${order.id} user=${session.user.id} amount=${amount_paise}`);

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[payments.create-order] ERROR:', err);
    res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
}
