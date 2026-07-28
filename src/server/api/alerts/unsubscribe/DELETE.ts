/**
 * DELETE /api/alerts/unsubscribe
 *
 * Deactivates a job alert subscription via its unsubscribe token.
 * Used by one-click unsubscribe links in emails.
 *
 * Query params:
 *   token   string   required  the unsubscribeToken from the subscription row
 */

import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { jobAlertSubscription } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: Request, res: Response) {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';

  if (!token) {
    return res.status(400).json({ error: 'Unsubscribe token is required.' });
  }

  try {
    const rows = await db
      .select({ id: jobAlertSubscription.id, active: jobAlertSubscription.active })
      .from(jobAlertSubscription)
      .where(eq(jobAlertSubscription.unsubscribeToken, token))
      .limit(1);

    if (rows.length === 0) {
      // Token not found — treat as success so we don't leak subscription existence
      return res.json({ success: true, alreadyUnsubscribed: true });
    }

    if (!rows[0].active) {
      return res.json({ success: true, alreadyUnsubscribed: true });
    }

    await db
      .update(jobAlertSubscription)
      .set({ active: false })
      .where(eq(jobAlertSubscription.unsubscribeToken, token));

    return res.json({ success: true, alreadyUnsubscribed: false });
  } catch (err) {
    console.error('[DELETE /api/alerts/unsubscribe]', err);
    return res.status(500).json({ error: 'Failed to unsubscribe. Please try again.' });
  }
}
