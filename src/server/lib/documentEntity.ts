/**
 * Shared resolver for the post-shortlist document system. A document
 * request/submission can be attached to either a consultant `submission`
 * or a direct `candidateApplication` — this normalizes both into one
 * shape so the API handlers don't need to branch everywhere.
 */
import { db } from '@/server/db/client.js';
import { submission, candidateApplication, job, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';

export type DocEntityType = 'submission' | 'application';

export interface ResolvedDocEntity {
  id: number;
  candidateName: string;
  candidateEmail: string;
  candidateUserId: string | null;
  consultantUserId: string | null;  // null for direct applications — there is no consultant
  jobTitle: string | null;
  companyName: string | null;
  postedByUserId: string | null;    // employer who owns the job
}

export async function resolveDocEntity(entityType: DocEntityType, entityIdRaw: string): Promise<ResolvedDocEntity | null> {
  const entityId = parseInt(entityIdRaw, 10);
  if (isNaN(entityId)) return null;

  if (entityType === 'submission') {
    const [row] = await db.select({
      id: submission.id,
      candidateName: submission.candidateName,
      candidateEmail: submission.candidateEmail,
      candidateUserId: submission.candidateUserId,
      consultantUserId: submission.consultantUserId,
      jobTitle: job.title,
      companyName: job.company,
      postedByUserId: job.postedByUserId,
    }).from(submission)
      .leftJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.id, entityId)).limit(1);
    return row || null;
  }

  if (entityType === 'application') {
    const [row] = await db.select({
      id: candidateApplication.id,
      candidateName: user.name,
      candidateEmail: user.email,
      candidateUserId: candidateApplication.candidateUserId,
      jobTitle: job.title,
      companyName: job.company,
      postedByUserId: job.postedByUserId,
    }).from(candidateApplication)
      .leftJoin(job, eq(candidateApplication.jobId, job.id))
      .leftJoin(user, eq(candidateApplication.candidateUserId, user.id))
      .where(eq(candidateApplication.id, entityId)).limit(1);
    return row ? { ...row, consultantUserId: null } : null;
  }

  return null;
}

export function isValidEntityType(v: unknown): v is DocEntityType {
  return v === 'submission' || v === 'application';
}
