/**
 * Helpers for hiding a suspended or removed candidate from employers.
 * Shortlisted, placed and selected applications stay visible to the employer.
 * Admins always see everything (callers check the role first).
 */
import { eq, inArray, isNotNull, notInArray, or, type SQL } from 'drizzle-orm';
import { db } from '@/server/db/client.js';
import { candidateApplication, user } from '@/server/db/schema.js';

export const KEEP_VISIBLE_APPLICATION_STATUSES = ['shortlisted', 'placed', 'selected'];

// True when the candidate behind an application is suspended or removed, and the application is not shortlisted/placed/selected.
export async function applicationHiddenFromEmployer(applicationId: number): Promise<boolean> {
  if (!Number.isFinite(applicationId)) return false;
  const [row] = await db
    .select({ status: candidateApplication.status, suspendedAt: user.suspendedAt, removedAt: user.removedAt })
    .from(candidateApplication)
    .innerJoin(user, eq(user.id, candidateApplication.candidateUserId))
    .where(eq(candidateApplication.id, applicationId))
    .limit(1);
  if (!row) return false;
  const inactive = Boolean(row.suspendedAt || row.removedAt);
  return inactive && !KEEP_VISIBLE_APPLICATION_STATUSES.includes(row.status ?? '');
}

// SQL condition: keep applications from active candidates, plus shortlisted/placed/selected ones.
export function visibleApplicationCondition(): SQL {
  const inactiveIds = db
    .select({ id: user.id })
    .from(user)
    .where(or(isNotNull(user.suspendedAt), isNotNull(user.removedAt)));
  return or(
    notInArray(candidateApplication.candidateUserId, inactiveIds),
    inArray(candidateApplication.status, KEEP_VISIBLE_APPLICATION_STATUSES),
  ) as SQL;
}

