// ═══════════════════════════════════════════════════════════════════
// NEW FILE: src/server/api/organization/members/[id]/DELETE.ts
// (folder name literally "[id]" — matches your existing dynamic route
//  convention, e.g. src/server/api/jobs/[id]/apply/POST.ts)
// ═══════════════════════════════════════════════════════════════════
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { organization, organizationMember } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { canManageTeam, type OrgRole } from '@/server/lib/orgPermissions.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers }).catch(() => null);

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const memberId = parseInt(req.params.id, 10);
    if (isNaN(memberId)) {
      return res.status(400).json({ error: 'Invalid member id' });
    }

    const [member] = await db
      .select()
      .from(organizationMember)
      .where(eq(organizationMember.id, memberId))
      .limit(1);

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Owner OR Team Lead of this specific organization can remove members
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, member.organizationId))
      .limit(1);

    const isOwner = org?.ownerId === session.user.id;
    let isTeamLeadHere = false;
    if (!isOwner) {
      const [requesterMembership] = await db
        .select({ role: organizationMember.role, status: organizationMember.status })
        .from(organizationMember)
        .where(and(eq(organizationMember.userId, session.user.id), eq(organizationMember.organizationId, member.organizationId)))
        .limit(1);
      isTeamLeadHere = !!requesterMembership && requesterMembership.status === 'active' && canManageTeam(requesterMembership.role as OrgRole);
    }

    if (!org || (!isOwner && !isTeamLeadHere)) {
      return res.status(403).json({ error: 'Only the organization owner or a Team Lead can remove members' });
    }

    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove the organization owner' });
    }

    await db
      .update(organizationMember)
      .set({ status: 'removed' })
      .where(eq(organizationMember.id, memberId));

    res.json({ message: `${member.email} removed from team` });
  } catch (err) {
    console.error('[DELETE /api/organization/members/:id] Error:', err);
    res.status(500).json({ error: 'Failed to remove member' });
  }
}
