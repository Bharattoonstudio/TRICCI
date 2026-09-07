/**
 * POST /api/employer/placements/:id/offer/withdraw
 * Employer withdraws/recalls an offer that was sent but not yet responded to.
 * Fixes: Accidental offers cannot be undone
 * Status transitions: sent → withdrawn
 * Notifies: candidate (withdrawal email), consultant (notification)
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement, user, notification } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { sendEmail } from '@/server/email.js';
import { isReadOnlyOrgViewer } from '@/server/lib/orgPermissions.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });
    if (role === 'employer' && await isReadOnlyOrgViewer(session.user.id)) {
      return res.status(403).json({ error: 'read_only', message: 'Viewer accounts have read-only access' });
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid placement ID' });

    // Get placement and validate ownership
    const [row] = await db.select().from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });
    if (role === 'employer' && row.employerUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your placement' });
    }

    // Can only withdraw if offer was sent but not yet responded
    if (row.offerStatus !== 'sent') {
      return res.status(400).json({
        error: `Cannot withdraw — offer status is "${row.offerStatus}"`,
        message: 'Can only withdraw offers that have been sent and not yet accepted/declined',
      });
    }

    // Mark as withdrawn
    await db.update(placement).set({
      offerStatus: 'withdrawn',
      offerWithdrawnAt: new Date(),
      offerWithdrawnBy: session.user.id,
    }).where(eq(placement.id, id));

    // Notify consultant
    if (row.consultantUserId) {
      await db.insert(notification).values({
        userId: row.consultantUserId,
        type: 'offer_withdrawn',
        message: `Offer withdrawn for ${row.candidateName} — ${row.jobTitle}`,
        link: '/consultant/dashboard',
      }).catch(() => {});
    }

    // Email candidate about withdrawal
    await Promise.allSettled([
      sendEmail({
        to: row.candidateEmail,
        subject: `Offer Withdrawn — ${row.jobTitle} at ${row.companyName}`,
        html: `
          <p>Dear <strong>${row.candidateName}</strong>,</p>
          <p>We are writing to inform you that the offer for <strong>${row.jobTitle}</strong> 
          at <strong>${row.companyName}</strong> has been withdrawn.</p>
          <p>We apologize for any inconvenience this may have caused.</p>
          <p>If you have any questions, please feel free to reach out to us.</p>
          <p>Best regards,<br/>${row.companyName} Team</p>
        `,
        senderName: row.companyName,
      }).catch(e => {
        console.error('[offer.withdraw.email.error]', e);
      }),
    ]);

    res.json({ ok: true, offerStatus: 'withdrawn' });
  } catch (err) {
    console.error('[employer.placements.offer.withdraw] ERROR:', err);
    res.status(500).json({ error: 'Failed to withdraw offer' });
  }
}
