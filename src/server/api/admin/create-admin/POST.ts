/**
 * POST /api/admin/create-admin
 *
 * Creates an admin account. Two modes:
 * 1. First-run: if zero admins exist, anyone can call this with ADMIN_SETUP_KEY secret.
 * 2. Existing admin: must be authenticated as admin.
 *
 * Body: { name, email, password, setupKey? }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { user } from '@/server/db/schema.js';
import { eq, count } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { randomUUID } from 'crypto';
// Use BetterAuth's own password hasher so the stored hash is verifiable at login
import { hashPassword } from '@better-auth/utils/password';

export default async function handler(req: Request, res: Response) {
  try {
    const { name, email, password, setupKey } = req.body as {
      name?: string; email?: string; password?: string; setupKey?: string;
    };

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check how many admins exist
    const [adminCount] = await db
      .select({ count: count() })
      .from(user)
      .where(eq(user.role, 'admin'));

    const isFirstAdmin = adminCount.count === 0;

    if (isFirstAdmin) {
      // First-run mode: validate setup key
      const configuredKey = process.env.ADMIN_SETUP_KEY;
      if (!configuredKey || setupKey !== configuredKey) {
        return res.status(403).json({
          error: 'Invalid setup key. Set ADMIN_SETUP_KEY secret and pass it as setupKey.',
        });
      }
    } else {
      // Subsequent admins: must be authenticated as admin
      const auth = getAuth();
      const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
      const role = (session?.user as { role?: string } | null)?.role;
      if (!session || role !== 'admin') {
        return res.status(403).json({ error: 'Must be authenticated as admin to create additional admins' });
      }
    }

    // Check email not already taken
    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Hash using BetterAuth's own hasher — guarantees login will verify correctly
    const hashedPassword = await hashPassword(password);

    // Insert directly — bypasses BetterAuth signUpEmail so we can set role + emailVerified immediately
    await db.insert(user).values({
      id: randomUUID(),
      name,
      email,
      role: 'admin',
      isAdmin: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert the credential row that BetterAuth expects for email/password login
    // BetterAuth stores hashed passwords in the `account` table with providerId='credential'
    const [newUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
    if (newUser) {
      const { account } = await import('@/server/db/schema.js');
      await db.insert(account).values({
        id: randomUUID(),
        userId: newUser.id,
        accountId: newUser.id,
        providerId: 'credential',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    res.status(201).json({
      success: true,
      message: `Admin account created for ${email}. You can now log in at /admin/login`,
    });
  } catch (err) {
    console.error('admin.create-admin.error', err);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
}
