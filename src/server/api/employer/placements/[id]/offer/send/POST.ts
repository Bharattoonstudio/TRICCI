/**
 * POST /api/employer/placements/:id/offer/send
 * Employer sends an offer for a selected candidate — sets offered CTC and
 * expiry, moves the underlying submission to 'offered', and emails the
 * candidate + consultant (point 14: "on selection → email to consultant:
 * release offer, submit documents").
 * Body: { offerCtcLpa: number, offerExpiryDate: ISO string, note?: string }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement, submission, user, notification } from '@/server/db/schema.js';
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

    const { offerCtcLpa, offerExpiryDate, note } = req.body as { offerCtcLpa?: number; offerExpiryDate?: string; note?: string };
    if (!offerCtcLpa || offerCtcLpa <= 0) return res.status(400).json({ error: 'A valid offered CTC is required' });
    if (!offerExpiryDate || isNaN(new Date(offerExpiryDate).getTime())) return res.status(400).json({ error: 'A valid offer expiry date is required' });

    const [row] = await db.select().from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });
    if (role === 'employer' && row.employerUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your placement' });
    }

    await db.update(placement).set({
      offerStatus: 'sent',
      offerCtcLpa,
      offerSentAt: new Date(),
      offerExpiryDate: new Date(offerExpiryDate),
      offerNote: note?.trim() || null,
    }).where(eq(placement.id, id));

    await db.update(submission).set({ status: 'offered', updatedAt: new Date() }).where(eq(submission.id, row.submissionId));

    // Notify consultant (point 14) + candidate
    const recipients: string[] = [row.candidateEmail];
    if (row.consultantUserId) {
      const [consultant] = await db.select({ email: user.email }).from(user).where(eq(user.id, row.consultantUserId)).limit(1);
      if (consultant?.email) recipients.push(consultant.email);
      await db.insert(notification).values({
        userId: row.consultantUserId,
        type: 'offer_released',
        message: `Offer released for ${row.candidateName} — ${row.jobTitle}`,
        link: '/consultant/dashboard',
      }).catch(() => {});
    }

    await Promise.allSettled(recipients.map(to => sendEmail({
      to,
      subject: `Offer released — ${row.candidateName} for ${row.jobTitle}`,
      html: `<p>An offer has been released for <strong>${row.candidateName}</strong> — <strong>${row.jobTitle}</strong> at ${row.companyName}.</p><p>Offered CTC: <strong>₹${offerCtcLpa}L</strong></p><p>Offer valid until: <strong>${new Date(offerExpiryDate).toLocaleDateString('en-IN')}</strong></p>${note ? `<p>${note}</p>` : ''}`,
    }).catch(e => console.error('offer.send.email.error', e))));

    res.json({ ok: true, offerStatus: 'sent' });
  } catch (err) {
    console.error('[employer.placements.offer.send] ERROR:', err);
    res.status(500).json({ error: 'Failed to send offer' });
  }
}
