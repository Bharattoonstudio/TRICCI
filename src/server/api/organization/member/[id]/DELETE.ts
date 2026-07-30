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

    // Only the organization owner (admin) can remove members
    const [org] = await db
      .select()
      .from(organization)
      .where(and(eq(organization.id, member.organizationId), eq(organization.ownerId, session.user.id)))
      .limit(1);

    if (!org) {
      return res.status(403).json({ error: 'Only the organization owner (admin) can remove members' });
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
