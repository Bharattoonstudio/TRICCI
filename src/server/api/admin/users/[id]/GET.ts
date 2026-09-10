/**
 * GET /api/admin/users/:id
 * Admin-only. Returns full profile details for a user.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { user, candidateProfile, employerProfile, consultantProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const [u] = await db.select().from(user).where(eq(user.id, String(id)));
    if (!u) return res.status(404).json({ error: 'User not found' });

    let profile = null;
    if (u.role === 'candidate') {
      const [p] = await db.select().from(candidateProfile).where(eq(candidateProfile.userId, String(id)));
      profile = p ?? null;
    } else if (u.role === 'employer') {
      const [p] = await db.select().from(employerProfile).where(eq(employerProfile.userId, String(id)));
      profile = p ?? null;
    } else if (u.role === 'consultant') {
      const [p] = await db.select().from(consultantProfile).where(eq(consultantProfile.userId, String(id)));
      profile = p ?? null;
    }

    res.json({ user: u, profile });
  } catch (err) {
    console.error('admin.users.id.get.error', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
}
