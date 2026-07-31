/**
 * Server-side agreement/T&C enforcement.
 *
 * IMPORTANT: Before this, agreement acceptance was only checked in the
 * frontend (React state), meaning a consultant/employer/candidate could
 * call the underlying APIs directly (or the UI gate could glitch) and
 * still post jobs / submit candidates / apply — completely bypassing
 * the "nothing works until agreement is accepted" rule. This closes
 * that gap for all three roles at the API layer, which is the only
 * place a bypass-proof check can actually live.
 */
import { db } from '@/server/db/client.js';
import { employerProfile, consultantProfile, candidateProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';

export type AgreementRole = 'employer' | 'consultant' | 'candidate';

const TABLE_BY_ROLE = {
  employer: employerProfile,
  consultant: consultantProfile,
  candidate: candidateProfile,
} as const;

/**
 * Returns true if the given user has signed the agreement for the given role.
 * Admins are always exempt (they don't have profiles of these types).
 */
export async function hasSignedAgreement(userId: string, role: AgreementRole): Promise<boolean> {
  const table = TABLE_BY_ROLE[role];
  const [row] = await db
    .select({ agreementSignedAt: table.agreementSignedAt })
    .from(table as any)
    .where(eq((table as any).userId, userId))
    .limit(1);
  return !!row?.agreementSignedAt;
}
