/**
 * Shared "actually send the offer" logic — used both by the direct
 * OfferModal flow (offer/send) and by the internal approval workflow
 * (offer/approve), so both paths notify/email identically.
 */
import { db } from '@/server/db/client.js';
import { placement, submission, candidateApplication, user, notification } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/server/email.js';

interface PlacementRow {
  id: number;
  submissionId: number | null;
  applicationId: number | null;
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  consultantUserId: string | null;
}

export async function dispatchOffer(row: PlacementRow, offerCtcLpa: number, offerExpiryDate: string, note?: string) {
  await db.update(placement).set({
    offerStatus: 'sent',
    offerCtcLpa,
    offerSentAt: new Date(),
    offerExpiryDate: new Date(offerExpiryDate),
    offerNote: note?.trim() || null,
  }).where(eq(placement.id, row.id));

  if (row.submissionId) {
    await db.update(submission).set({ status: 'offered', updatedAt: new Date() }).where(eq(submission.id, row.submissionId));
  } else if (row.applicationId) {
    await db.update(candidateApplication).set({ status: 'offered', updatedAt: new Date() }).where(eq(candidateApplication.id, row.applicationId));
  }

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
}
