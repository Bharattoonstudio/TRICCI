// ═══════════════════════════════════════════════════════════════════
// NEW FILE: src/server/api/organization/members/[id]/reset-password/POST.ts
// Lets the organization OWNER (admin) set a new password for a team
// member directly — e.g. when that person leaves or is locked out.
// Updates the `account` table's password hash directly (same approach
// as admin/create-admin/POST.ts) — no BetterAuth admin plugin required.
// ═══════════════════════════════════════════════════════════════════
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { organization, organizationMember, account } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { hashPassword } from '@better-auth/utils/password';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers }).catch(() => null);

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { newPassword } = req.body as { newPassword?: string };
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
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

    if (!member || !member.userId) {
      return res.status(404).json({ error: 'Member not found or has not accepted invite yet' });
    }

    // Only the organization owner (admin) can reset a member's password
    const [org] = await db
      .select()
      .from(organization)
      .where(and(eq(organization.id, member.organizationId), eq(organization.ownerId, session.user.id)))
      .limit(1);

    if (!org) {
      return res.status(403).json({ error: "Only the organization owner (admin) can reset a member's password" });
    }

    if (member.role === 'owner') {
      return res.status(400).json({ error: 'Cannot reset the admin\'s own password from here — use the normal "forgot password" flow' });
    }

    const hashedPassword = await hashPassword(newPassword);

    await db
      .update(account)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(and(eq(account.userId, member.userId), eq(account.providerId, 'credential')));

    res.json({ message: `Password reset for ${member.email}. Share the new password with them securely.` });
  } catch (err) {
    console.error('[POST /api/organization/members/:id/reset-password] Error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}
