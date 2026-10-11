/**
 * POST /api/account/mobile
 * Body: { phone: string }
 * Saves the signed-in user's mobile number on their role profile
 * (candidate / employer / consultant). Session required.
 */
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client.js';
import { user, candidateProfile, employerProfile, consultantProfile } from '@/server/db/schema.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function account_mobile_post(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const raw = String((req.body as { phone?: unknown })?.phone ?? '');
    const phone = raw.replace(/\s/g, '').replace(/^(\+91)?/, '');
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });
    }

    const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, session.user.id));
    const role = row?.role ?? 'candidate';

    if (role === 'candidate') {
      await db.update(candidateProfile).set({ phone }).where(eq(candidateProfile.userId, session.user.id));
    } else if (role === 'employer') {
      await db.update(employerProfile).set({ phone }).where(eq(employerProfile.userId, session.user.id));
    } else if (role === 'consultant') {
      await db.update(consultantProfile).set({ phone }).where(eq(consultantProfile.userId, session.user.id));
    } else {
      return res.status(400).json({ error: 'Mobile is not supported for this account type' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('account.mobile.error', err);
    res.status(500).json({ error: 'Could not save mobile number' });
  }
}
