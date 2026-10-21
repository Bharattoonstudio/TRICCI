/**
 * Looks up a consultant's plan and the share of the placement fee they earn.
 * Falls back to the Free share if the profile is missing or the lookup fails,
 * so a database hiccup never blocks an offer.
 */
import { db } from '@/server/db/client.js';
import { consultantProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import {
  consultantSharePctForPlan,
  CONSULTANT_SHARE_PCT_FREE,
  PRO_PLAN_ACTIVE,
  PRO_PLAN_MIN_AGREEMENT_VERSION,
  isAgreementAtLeast,
} from '@/server/lib/employerFee.js';

export async function consultantSharePctFor(consultantUserId: string | null | undefined): Promise<number> {
  if (!consultantUserId) return CONSULTANT_SHARE_PCT_FREE;
  try {
    const [row] = await db
      .select({ plan: consultantProfile.plan, agreementVersion: consultantProfile.agreementVersion })
      .from(consultantProfile)
      .where(eq(consultantProfile.userId, consultantUserId))
      .limit(1);
    return consultantSharePctForPlan(row?.plan, row?.agreementVersion);
  } catch (err) {
    console.error('consultant.plan.lookup.error', err);
    return CONSULTANT_SHARE_PCT_FREE;
  }
}

/**
 * Move a consultant to the Pro plan once Pro billing has been paid.
 * If the consultant has not accepted the Pro agreement version, the signature is
 * cleared so the existing agreement gate makes them re-accept before any action.
 */
export async function activateProPlan(consultantUserId: string): Promise<{ plan: 'pro'; agreementAcceptanceRequired: boolean }> {
  if (!PRO_PLAN_ACTIVE) throw new Error('Pro plan is not active');
  const [row] = await db
    .select({ agreementVersion: consultantProfile.agreementVersion })
    .from(consultantProfile)
    .where(eq(consultantProfile.userId, consultantUserId))
    .limit(1);
  if (!row) throw new Error('Consultant profile not found');

  const accepted = isAgreementAtLeast(row.agreementVersion, PRO_PLAN_MIN_AGREEMENT_VERSION);
  await db
    .update(consultantProfile)
    .set({ plan: 'pro', ...(accepted ? {} : { agreementSignedAt: null }) })
    .where(eq(consultantProfile.userId, consultantUserId));
  return { plan: 'pro', agreementAcceptanceRequired: !accepted };
}
