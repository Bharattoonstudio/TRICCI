// ═══════════════════════════════════════════════════════════════════
// NEW FILE: src/server/api/organization/accept-invite/POST.ts
// Called when an invited teammate sets a password and creates their account.
// Mirrors the pattern used in src/server/api/admin/create-admin/POST.ts —
// inserts directly into user + account tables using BetterAuth's own
// password hasher, so login works correctly afterward.
// ═══════════════════════════════════════════════════════════════════
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { organization, organizationMember, user, account, employerProfile, consultantProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { hashPassword } from '@better-auth/utils/password';

export default async function handler(req: Request, res: Response) {
  try {
    const { token, name, password } = req.body as { token?: string; name?: string; password?: string };

    if (!token || !name || !password) {
      return res.status(400).json({ error: 'Token, name and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const [invite] = await db
      .select()
      .from(organizationMember)
      .where(eq(organizationMember.inviteToken, token))
      .limit(1);

    if (!invite || invite.status !== 'pending') {
      return res.status(400).json({ error: 'Invalid or already-used invite link' });
    }

    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, invite.organizationId))
      .limit(1);

    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check email not already registered
    const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, invite.email));
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const newUserId = randomUUID();
    const hashedPassword = await hashPassword(password);

    // Create the user with role matching the organization type (employer/consultant)
    await db.insert(user).values({
      id: newUserId,
      name,
      email: invite.email,
      role: org.type, // 'employer' or 'consultant'
      isAdmin: false,
      emailVerified: true, // invite link itself is the verification
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert the credential row BetterAuth expects for email/password login
    await db.insert(account).values({
      id: randomUUID(),
      userId: newUserId,
      accountId: newUserId,
      providerId: 'credential',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create a minimal profile row so the dashboard doesn't break,
    // and link it to the SAME organization (not a new one)
    if (org.type === 'employer') {
      await db.insert(employerProfile).values({ userId: newUserId, organizationId: org.id });
    } else if (org.type === 'consultant') {
      await db.insert(consultantProfile).values({ userId: newUserId, organizationId: org.id });
    }

    // Mark invite as accepted and link the new user
    await db
      .update(organizationMember)
      .set({
        userId: newUserId,
        status: 'active',
        joinedAt: new Date(),
        inviteToken: null,
      })
      .where(eq(organizationMember.id, invite.id));

    res.status(201).json({
      message: `Account created. You can now log in at /login with ${invite.email}`,
      organizationName: org.name,
    });
  } catch (err) {
    console.error('[POST /api/organization/accept-invite] Error:', err);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
}
