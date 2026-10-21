/**
 * Loads what the consultant invoice needs: the placement, its job fee settings,
 * the employer's offered CTC, and the consultant's share. Returns null when the
 * placement does not exist or belongs to someone else.
 */
import { db } from '../db/client.js';
import { placement, job } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { EmployerFee } from './employerFee.js';

export interface InvoiceContext {
  placementId: number;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  offerCtcLpa: number | null;
  fee: EmployerFee;
}

export async function loadInvoiceContext(placementId: number, consultantUserId: string): Promise<InvoiceContext | null> {
  const [row] = await db
    .select({
      placementId: placement.id,
      consultantUserId: placement.consultantUserId,
      candidateName: placement.candidateName,
      jobTitle: placement.jobTitle,
      companyName: placement.companyName,
      offerCtcLpa: placement.offerCtcLpa,
      feeType: job.feeType,
      feePercent: job.feePercent,
      feeAmountRupees: job.feeAmountRupees,
    })
    .from(placement)
    .leftJoin(job, eq(placement.jobId, job.id))
    .where(eq(placement.id, placementId))
    .limit(1);

  if (!row || row.consultantUserId !== consultantUserId) return null;

  return {
    placementId: row.placementId,
    candidateName: row.candidateName,
    jobTitle: row.jobTitle,
    companyName: row.companyName,
    offerCtcLpa: row.offerCtcLpa ?? null,
    fee: {
      feeType: row.feeType === 'amount' ? 'amount' : 'percent',
      feePercent: row.feePercent ?? 0,
      feeAmountRupees: row.feeAmountRupees ?? null,
    },
  };
}
