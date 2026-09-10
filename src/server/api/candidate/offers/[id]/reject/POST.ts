/**
 * POST /api/candidate/offers/:id/reject
 * Candidate declines a job offer
 * Notifies employer and consultant
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

    const { reason } = req.body;

    // Get offer and verify ownership
    const [offer] = await db.select().from(placement).where(eq(placement.id, offerId)).limit(1);
    if (!offer) return res.status(404).json({ error: 'Offer not found' });
    if (offer.candidateEmail !== session.user.email) {
      return res.status(403).json({ error: 'Not your offer' });
    }

    // Validate offer can be declined
    if (offer.offerStatus !== 'sent') {
      return res.status(400).json({
        error: 'Cannot decline this offer',
        message: `Offer status is already "${offer.offerStatus}"`,
      });
    }

    // Update offer status
    await db.update(placement)
      .set({
        offerStatus: 'declined',
        offerRespondedAt: new Date(),
        offerNote: reason ? `Declined: ${reason}` : 'Declined',
      })
      .where(eq(placement.id, offerId));

    // Notify employer
    if (offer.employerUserId) {
      await db.insert(notification).values({
        userId: offer.employerUserId,
        type: 'offer_declined',
        message: `${offer.candidateName} declined your offer for ${offer.jobTitle}`,
        link: `/employer/jobs/${offer.jobId}`,
      }).catch(() => {});
    }

    // Notify consultant
    if (offer.consultantUserId) {
      await db.insert(notification).values({
        userId: offer.consultantUserId,
        type: 'offer_declined',
        message: `${offer.candidateName} declined offer from ${offer.companyName}`,
        link: `/consultant/dashboard`,
      }).catch(() => {});
    }

    // Email employer
    await Promise.allSettled([
      sendEmail({
        to: 'employer@tricci.in',
        subject: `Offer Declined — ${offer.candidateName}`,
        html: `
          <p><strong>${offer.candidateName}</strong> has declined your offer for <strong>${offer.jobTitle}</strong>.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>Please consider other candidates in your pipeline.</p>
        `,
      }).catch(e => {
        console.error('[offer.decline.email.error]', e);
      }),
    ]);

    res.json({ ok: true, offerStatus: 'declined' });
  } catch (err) {
    console.error('[candidate.offers.reject] ERROR:', err);
    res.status(500).json({ error: 'Failed to decline offer' });
  }
}
