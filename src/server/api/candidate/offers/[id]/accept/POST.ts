/**
 * POST /api/candidate/offers/:id/accept
 * Candidate accepts a job offer
 * Validates offer not expired, updates status, notifies employer
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement, notification } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const offerId = parseInt(String(req.params.id), 10);
    if (isNaN(offerId)) return res.status(400).json({ error: 'Invalid offer ID' });

    const { joiningDate } = req.body;

    // Get offer and verify ownership
    const [offer] = await db.select().from(placement).where(eq(placement.id, offerId)).limit(1);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.candidateEmail !== session.user.email) {
      return res.status(403).json({ error: 'Not your offer' });
    }

    // Validate offer can be accepted
    if (offer.offerStatus !== 'sent') {
      return res.status(400).json({
        error: 'Cannot accept this offer',
        message: `Offer status is already "${offer.offerStatus}"`,
      });
    }

    // Validate offer not expired
    if (offer.offerExpiryDate && new Date(offer.offerExpiryDate) < new Date()) {
      return res.status(400).json({ error: 'Offer has expired' });
    }

    // Update offer status
    await db.update(placement)
      .set({
        offerStatus: 'accepted',
        offerRespondedAt: new Date(),
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        updatedAt: new Date(),
      })
      .where(eq(placement.id, offerId));

    // Notify employer
    if (offer.employerUserId) {
      await db.insert(notification).values({
        userId: offer.employerUserId,
        type: 'offer_accepted',
        message: `${offer.candidateName} accepted your offer for ${offer.jobTitle}`,
        link: `/employer/ats/submissions/${offer.submissionId}`,
      }).catch(() => {});
    }

    // Email employer
    await Promise.allSettled([
      sendEmail({
        to: 'employer@tricci.in', // Would be employer email
        subject: `Offer Accepted — ${offer.candidateName}`,
        html: `
          <p><strong>${offer.candidateName}</strong> has accepted your offer for <strong>${offer.jobTitle}</strong>.</p>
          <p>Joining Date: <strong>${joiningDate ? new Date(joiningDate).toLocaleDateString('en-IN') : 'To be confirmed'}</strong></p>
          <p>CTC: <strong>₹${offer.offerCtcLpa}L</strong></p>
        `,
      }).catch(e => {
        console.error('[offer.accept.email.error]', e);
      }),
    ]);

    res.json({ ok: true, offerStatus: 'accepted' });
  } catch (err) {
    console.error('[candidate.offers.accept] ERROR:', err);
    res.status(500).json({ error: 'Failed to accept offer' });
  }
}
