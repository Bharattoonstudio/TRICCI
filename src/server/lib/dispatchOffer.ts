/**
 * Shared "actually send the offer" logic — used both by the direct
 * OfferModal flow (offer/send) and by the internal approval workflow
 * (offer/approve), so both paths notify/email identically.
 */
import { db } from '@/server/db/client.js';
import { placement, submission, candidateApplication, user, notification, job } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/server/email.js';
import { getFeeConfig } from '@/server/lib/feeConfig.js';
import { placementFeeForOffer } from '@/server/lib/employerFee.js';

interface PlacementRow {
  id: number;
  jobId?: string | null;
  submissionId: number | null;
  applicationId: number | null;
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  consultantUserId: string | null;
}

export async function dispatchOffer(row: PlacementRow, offerCtcLpa: number, offerExpiryDate: string, note?: string) {
  // The placement fee is calculated on the offer CTC, using the fee option the
  // employer chose on the job (percentage of CTC, or a fixed rupee amount).
  if (row.jobId) {
    const [jobFee] = await db
      .select({ feeType: job.feeType, feePercent: job.feePercent, feeAmountRupees: job.feeAmountRupees })
      .from(job)
      .where(eq(job.id, row.jobId))
      .limit(1);
    if (jobFee) {
      const cfg = await getFeeConfig();
      const fee = placementFeeForOffer(
        {
          feeType: jobFee.feeType === 'amount' ? 'amount' : 'percent',
          feePercent: jobFee.feePercent,
          feeAmountRupees: jobFee.feeAmountRupees,
        },
        offerCtcLpa,
        cfg.platformFeePct,
        !!row.consultantUserId,
      );
      await db.update(placement).set({
        feePercent: fee.feePercent,
        feeAmountLpa: fee.feeAmountLpa,
        platformFeePercent: fee.platformFeePercent,
        consultantFeePercent: fee.consultantFeePercent,
        consultantFeeAmountLpa: fee.consultantFeeAmountLpa,
      }).where(eq(placement.id, row.id));
    }
  }

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
