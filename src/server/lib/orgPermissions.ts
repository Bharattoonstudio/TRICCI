/**
 * Organization permission helper. Extended from the original
 * viewer-only check to a real role matrix, matching the PRD's original
 * ask (Owner / Team Lead / Recruiter / Finance / Viewer). Team members
 * are invited with one of: 'recruiter', 'team_lead', 'finance', 'viewer'.
 * The organization owner is always full-access and isn't stored as an
 * organizationMember row for themselves.
 */
import { db } from '@/server/db/client.js';
import { organizationMember, organization } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';

export type OrgRole = 'owner' | 'team_lead' | 'recruiter' | 'finance' | 'viewer' | null;

/**
 * Resolves the effective org role for a user: 'owner' if they own an
 * organization, their invited role if they're a member, or null if
 * they're not part of any organization at all (solo account — always
 * treated as full-access to their own data).
 */
export async function getOrgRole(userId: string): Promise<OrgRole> {
  const [ownedOrg] = await db.select({ id: organization.id }).from(organization).where(eq(organization.ownerId, userId)).limit(1);
  if (ownedOrg) return 'owner';

  const [member] = await db
    .select({ role: organizationMember.role, status: organizationMember.status })
    .from(organizationMember)
    .where(eq(organizationMember.userId, userId))
    .limit(1);

  if (!member || member.status !== 'active') return null;
  const role = member.role as OrgRole;
  return ['team_lead', 'recruiter', 'finance', 'viewer'].includes(role as string) ? role : 'recruiter';
}

/** Can this role post/manage jobs and candidate actions (shortlist, reject, offers)? */
export function canManageJobs(role: OrgRole): boolean {
  return role === null || role === 'owner' || role === 'team_lead' || role === 'recruiter';
}

/** Can this role invite/remove team members? */
export function canManageTeam(role: OrgRole): boolean {
  return role === null || role === 'owner' || role === 'team_lead';
}

/** Can this role access/act on billing, wallet, and invoices? */
export function canManageBilling(role: OrgRole): boolean {
  return role === null || role === 'owner' || role === 'finance';
}

/** Backwards-compatible helper — kept so Phase W/X call sites still work
 * unchanged; now correctly also covers 'finance' as read-only for job
 * actions, not just 'viewer'. */
export async function isReadOnlyOrgViewer(userId: string): Promise<boolean> {
  const role = await getOrgRole(userId);
  return !canManageJobs(role);
}

