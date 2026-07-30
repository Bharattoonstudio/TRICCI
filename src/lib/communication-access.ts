/**
 * Access control for the communication log. A note is scoped to one of:
 *  - 'job'          → visible to the employer who owns it (+ admin)
 *  - 'application'   → visible to the candidate + the employer who owns the job (+ admin)
 *  - 'submission'    → visible to the consultant who submitted + the employer who owns the job (+ admin)
 */
import { db } from '@/server/db/client.js';
import { job, candidateApplication, submission } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';

export type CommEntityType = 'job' | 'application' | 'submission';

export async function canAccessCommunicationLog(
  entityType: string,
  entityId: string,
  userId: string,
  role: string | undefined,
): Promise<boolean> {
  if (role === 'admin') return true;

  if (entityType === 'job') {
    const [row] = await db.select({ postedByUserId: job.postedByUserId })
      .from(job).where(eq(job.id, entityId)).limit(1);
    return !!row && row.postedByUserId === userId;
  }

  if (entityType === 'application') {
    const idNum = parseInt(entityId, 10);
    if (isNaN(idNum)) return false;
    const [row] = await db
      .select({ candidateUserId: candidateApplication.candidateUserId, postedByUserId: job.postedByUserId })
      .from(candidateApplication)
      .innerJoin(job, eq(candidateApplication.jobId, job.id))
      .where(eq(candidateApplication.id, idNum))
      .limit(1);
    if (!row) return false;
    return row.candidateUserId === userId || row.postedByUserId === userId;
  }

  if (entityType === 'submission') {
    const idNum = parseInt(entityId, 10);
    if (isNaN(idNum)) return false;
    const [row] = await db
      .select({ consultantUserId: submission.consultantUserId, postedByUserId: job.postedByUserId })
      .from(submission)
      .innerJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.id, idNum))
      .limit(1);
    if (!row) return false;
    return row.consultantUserId === userId || row.postedByUserId === userId;
  }

  return false;
}
