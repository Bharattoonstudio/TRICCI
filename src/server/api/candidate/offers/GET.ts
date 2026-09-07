/**
 * GET /api/candidate/offers
 * Retrieve all offers for logged-in candidate
 * Shows pending, accepted, rejected, withdrawn offers
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    // Get all offers for this candidate (by email matching)
    const offers = await db.select().from(placement)
      .where(eq(placement.candidateEmail, session.user.email || ''))
      .orderBy(placement.offerSentAt);

    const filtered = offers.filter(o => o.offerStatus !== 'not_sent');

    res.json({ offers: filtered });
  } catch (err) {
    console.error('[candidate.offers.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
}
