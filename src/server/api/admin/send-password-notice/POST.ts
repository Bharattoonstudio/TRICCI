/**
 * POST /api/admin/send-password-notice
 * Admin only. Sends the one-time password notice to the ten legacy accounts.
 *
 * Body: { confirm: "SEND-PASSWORD-NOTICE" }
 * The recipients and text are fixed in this file (approved by the owner), so this
 * endpoint cannot be used to send anything else. Each email is sent individually,
 * with connect@tricci.in in Cc. Returns one result per address.
 */
import type { Request, Response } from 'express';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { sendEmail } from '@/server/email.js';

const CONFIRM = 'SEND-PASSWORD-NOTICE';
const CC = 'connect@tricci.in';
const SUBJECT = 'Please reset your TRICCI password';
const RECIPIENTS = [
  'hpzealimpact@gmail.com',
  'spriyanka.shinde25@gmail.com',
  'drrahulpandya@gmail.com',
  'ramshasumayya0412@gmail.com',
  'jetty@vinuvikinfotech.com',
  'nikhil_mech19@rediffmail.com',
  'hr@aviloxjobs.com',
  'dominic.recruiter18@gmail.com',
  'kishorepgr@stratifyelevate.com',
  'ssaircon.lko@gmail.com',
];
const TEXT = `Hello,

As part of our security update, TRICCI has moved all passwords to a more secure format. Because of this, your existing password may no longer work when you sign in.

To set a new password, please follow these steps:

1. Go to https://www.tricci.in/forgot-password
2. Enter the email address linked to your TRICCI account.
3. Open the reset email we send you (check your spam folder if you don't see it within a few minutes).
4. Click the "Reset Password" button and choose a new password.
5. Sign in with your new password.

The reset link is valid for one hour. If it expires, just repeat steps 1 to 5.

We will never ask you for your password by email or phone. If you have any problems, contact us at connect@tricci.in.

Thank you,
TRICCI Team`;

export default async function handler(req: Request, res: Response) {
  try {
    const authSession = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!authSession) return res.status(401).json({ error: 'Unauthorized' });
    if ((authSession.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (req.body?.confirm !== CONFIRM) {
      return res.status(400).json({ error: `Send requires confirm: "${CONFIRM}"` });
    }

    const results: { to: string; sent: boolean; error?: string }[] = [];
    for (const to of RECIPIENTS) {
      try {
        await sendEmail({ to, cc: CC, subject: SUBJECT, text: TEXT });
        results.push({ to, sent: true });
      } catch (err) {
        console.error('[admin/send-password-notice] failed for', to, err instanceof Error ? err.message : err);
        results.push({ to, sent: false, error: err instanceof Error ? err.message : 'send failed' });
      }
    }
    const sent = results.filter((r) => r.sent).length;
    return res.status(200).json({ total: RECIPIENTS.length, sent, results });
  } catch (error) {
    console.error('[admin/send-password-notice] error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not send notices' });
  }
}
