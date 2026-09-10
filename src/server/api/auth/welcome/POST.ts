/**
 * POST /api/auth/welcome
 * Called from the client after email verification succeeds.
 * Sends the role-aware welcome email once per user, and notifies the
 * admin (connect@tricci.in) with the full user list. Guarded by
 * welcomeSentAt so a duplicate client call (e.g. a page refresh right
 * after verification) doesn't fire either email twice.
 *
 * Body: { userId: string }  — the verified user's ID
 * Auth: session required (user must be logged in after auto-sign-in)
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendWelcomeEmail } from '@/server/emails/welcome.js';
import { sendAdminSignupNotification } from '@/server/emails/adminSignupNotification.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const userId = session.user.id;

    // Fetch the user row to get role and check welcomeSentAt
    const rows = await db
      .select({ id: user.id, name: user.name, email: user.email, role: user.role, welcomeSentAt: user.welcomeSentAt })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const u = rows[0];

    if (u.welcomeSentAt) {
      // Already handled for this user — no-op, keeps this endpoint safe
      // to call more than once without re-sending anything.
      return res.json({ success: true, alreadySent: true });
    }

    await db.update(user).set({ welcomeSentAt: new Date() }).where(eq(user.id, userId));

    // Fire-and-forget — don't block the response on email delivery
    sendWelcomeEmail(u.email, u.name, u.role ?? 'candidate').catch(err =>
      console.error('welcome_email.send.error', err),
    );
    sendAdminSignupNotification({ name: u.name, email: u.email, role: u.role ?? 'candidate' }).catch(err =>
      console.error('admin_signup_notification.send.error', err),
    );

    res.json({ success: true });
  } catch (err) {
    console.error('auth.welcome.post.error', err);
    res.status(500).json({ error: 'Failed to send welcome email' });
  }
}
