// ═══════════════════════════════════════════════════════════════════
// NEW FILE: src/server/api/organization/invite/POST.ts
// ═══════════════════════════════════════════════════════════════════
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { organization, organizationMember } from '@/server/db/schema.js';
import { eq, and, ne } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { randomBytes } from 'crypto';
import { sendEmail } from '@/server/email.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers }).catch(() => null);

    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { email, role } = req.body as { email?: string; role?: string };

    if (!email || !role || !['recruiter', 'team_lead', 'finance', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Valid email and role (recruiter|team_lead|finance|viewer) required' });
    }

    // Find the org this user has access to invite into — either they
    // literally own it, or they're a Team Lead member of it. Previously
    // this ONLY checked organization.ownerId, meaning a Team Lead
    // invited as a team member (their own separate account, not owning
    // any organization) could never actually invite anyone — a real gap
    // against "Team Lead: everything except billing" from the PRD.
    let org = (await db.select().from(organization).where(eq(organization.ownerId, session.user.id)).limit(1))[0];

    if (!org) {
      const [membership] = await db
        .select({ organizationId: organizationMember.organizationId, role: organizationMember.role, status: organizationMember.status })
        .from(organizationMember)
        .where(eq(organizationMember.userId, session.user.id))
        .limit(1);
      if (membership && membership.status === 'active' && membership.role === 'team_lead') {
        org = (await db.select().from(organization).where(eq(organization.id, membership.organizationId)).limit(1))[0];
      }
    }

    if (!org) {
      return res.status(403).json({ error: 'Only the organization owner or a Team Lead can invite members' });
    }

    // Check not already invited
    const [existing] = await db
      .select()
      .from(organizationMember)
      .where(and(eq(organizationMember.organizationId, org.id), eq(organizationMember.email, email)))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: 'This email has already been invited' });
    }

    // Enforce max 5 logins per organization (1 admin + up to 4 team members)
    const currentMembers = await db
      .select()
      .from(organizationMember)
      .where(and(eq(organizationMember.organizationId, org.id), ne(organizationMember.status, 'removed')));

    if (currentMembers.length >= 5) {
      return res.status(400).json({
        error: 'Maximum of 5 logins reached for this organization. Remove a member first to add a new one.',
      });
    }

    const inviteToken = randomBytes(24).toString('hex');

    await db.insert(organizationMember).values({
      organizationId: org.id,
      email,
      role,
      status: 'pending',
      inviteToken,
    });

    const inviteUrl = `https://www.tricci.in/accept-invite?token=${inviteToken}`;
    await sendEmail({
      to: email,
      subject: `You've been invited to join ${org.name} on TRICCI`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1A0A00;color:#F5F5F5;border-radius:12px;">
          <h1 style="color:#FF2400;font-size:24px;margin:0 0 8px;">You're invited!</h1>
          <p style="color:#aaa;margin:0 0 24px;">You've been invited to join <b>${org.name}</b> on TRICCI as a <b>${role}</b>.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#FF2400;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">Accept Invite</a>
          <p style="color:#666;font-size:12px;margin-top:24px;">If you weren't expecting this, you can safely ignore this email.</p>
        </div>
      `,
      text: `You've been invited to join ${org.name} on TRICCI as a ${role}. Accept here: ${inviteUrl}`,
    });

    res.json({ message: 'Invite sent successfully' });
  } catch (err) {
    console.error('[POST /api/organization/invite] Error:', err);
    res.status(500).json({ error: 'Failed to send invite' });
  }
}
