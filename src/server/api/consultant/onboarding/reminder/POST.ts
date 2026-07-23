/**
 * POST /api/consultant/onboarding/reminder
 * Sends the agreement reminder email if the consultant hasn't signed yet.
 * Called by the dashboard on first load when agreementSignedAt is null.
 * Rate-limited to once per 24h via a timestamp stored on the profile.
 */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { db } from '@/server/db/client.js';
import { consultantProfile, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { sendAgreementReminderEmail } from '@/server/emails/consultant-onboarding.js';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const role = (session.user as { role?: string }).role;
    if (role !== 'consultant') return res.status(403).json({ error: 'Consultant access required' });

    // Fetch profile
    const [profile] = await db
      .select({
        agreementSignedAt: consultantProfile.agreementSignedAt,
        reminderSentAt: consultantProfile.reminderSentAt,
      })
      .from(consultantProfile)
      .where(eq(consultantProfile.userId, session.user.id))
      .limit(1);

    // Already signed — no reminder needed
    if (profile?.agreementSignedAt) {
      return res.json({ sent: false, reason: 'already_signed' });
    }

    // Rate-limit: only send once per 24h
    if (profile?.reminderSentAt) {
      const elapsed = Date.now() - new Date(profile.reminderSentAt).getTime();
      if (elapsed < TWENTY_FOUR_HOURS) {
        return res.json({ sent: false, reason: 'rate_limited' });
      }
    }

    // Fetch user details
    const [userRow] = await db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userRow) return res.status(404).json({ error: 'User not found' });

    // Update reminderSentAt timestamp
    await db
      .update(consultantProfile)
      .set({ reminderSentAt: new Date() })
      .where(eq(consultantProfile.userId, session.user.id));

    // Send email (non-blocking)
    sendAgreementReminderEmail(userRow.email, userRow.name).catch(err =>
      console.error('consultant.reminder_email.error', err),
    );

    res.json({ sent: true });
  } catch (err) {
    console.error('[POST /api/consultant/onboarding/reminder]', err);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
}
