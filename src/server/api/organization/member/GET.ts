// ═══════════════════════════════════════════════════════════════════
// NEW FILE: src/server/api/organization/members/GET.ts
// ═══════════════════════════════════════════════════════════════════
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { organization, organizationMember } from '@/server/db/schema.js';
import { eq, ne, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers }).catch(() => null);

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the org this user belongs to — either as owner, or as an active member
    let orgId: string | undefined;

    const [ownedOrg] = await db
      .select()
      .from(organization)
      .where(eq(organization.ownerId, session.user.id))
      .limit(1);

    if (ownedOrg) {
      orgId = ownedOrg.id;
    } else {
      const [membership] = await db
        .select()
        .from(organizationMember)
        .where(and(eq(organizationMember.userId, session.user.id), eq(organizationMember.status, 'active')))
        .limit(1);
      orgId = membership?.organizationId;
    }

    if (!orgId) {
      return res.status(404).json({ error: 'No organization found for this user' });
    }

    const members = await db
      .select()
      .from(organizationMember)
      .where(and(eq(organizationMember.organizationId, orgId), ne(organizationMember.status, 'removed')));

    res.json({ members, total: members.length });
  } catch (err) {
    console.error('[GET /api/organization/members] Error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
}
