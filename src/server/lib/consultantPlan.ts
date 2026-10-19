/**
 * Looks up a consultant's plan and the share of the placement fee they earn.
 * Falls back to the Free share if the profile is missing or the lookup fails,
 * so a database hiccup never blocks an offer.
 */
import { db } from '@/server/db/client.js';
import { consultantProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { consultantSharePctForPlan, CONSULTANT_SHARE_PCT_FREE } from '@/server/lib/employerFee.js';

export async function consultantSharePctFor(consultantUserId: string | null | undefined): Promise<number> {
  if (!consultantUserId) return CONSULTANT_SHARE_PCT_FREE;
  try {
    const [row] = await db
      .select({ plan: consultantProfile.plan })
      .from(consultantProfile)
      .where(eq(consultantProfile.userId, consultantUserId))
      .limit(1);
    return consultantSharePctForPlan(row?.plan);
  } catch (err) {
    console.error('consultant.plan.lookup.error', err);
    return CONSULTANT_SHARE_PCT_FREE;
  }
}
