/** Razorpay client for invoice payments. Credentials come from the environment only. */
import Razorpay from 'razorpay';

export function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error('Razorpay credentials not configured');
  return { client: new Razorpay({ key_id, key_secret }), key_id, key_secret };
}
