/**
 * Helpers for hiding jobs whose employer has been suspended or removed by an admin.
 * Jobs are hidden, not changed, so reactivating or restoring the employer shows them again.
 */
import { eq, isNotNull, notInArray, or, isNull, type SQL } from 'drizzle-orm';
import { db } from '@/server/db/client.js';
import { user, job as jobTable } from '@/server/db/schema.js';

// True when the employer who posted a job is suspended or removed.
export async function posterIsInactive(postedByUserId: string | null): Promise<boolean> {
  if (!postedByUserId) return false;
  const [row] = await db
    .select({ suspendedAt: user.suspendedAt, removedAt: user.removedAt })
    .from(user)
    .where(eq(user.id, postedByUserId))
    .limit(1);
  return Boolean(row && (row.suspendedAt || row.removedAt));
}

// SQL condition: keep jobs with no poster, or whose poster is neither suspended nor removed.
export function visibleJobCondition(): SQL {
  const inactiveIds = db
    .select({ id: user.id })
    .from(user)
    .where(or(isNotNull(user.suspendedAt), isNotNull(user.removedAt)));
  return or(isNull(jobTable.postedByUserId), notInArray(jobTable.postedByUserId, inactiveIds)) as SQL;
}
