import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { user } from '@/server/db/schema.js';
import { eq, desc, like, or } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session || role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { roleFilter, search } = req.query as { roleFilter?: string; search?: string };

    let query = db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(desc(user.createdAt))
      .$dynamic();

    if (roleFilter && roleFilter !== 'all') {
      query = query.where(eq(user.role, roleFilter));
    }

    if (search) {
      const term = `%${search}%`;
      query = query.where(or(like(user.name, term), like(user.email, term)));
    }

    const users = await query.limit(200);
    res.json({ users });
  } catch (err) {
    console.error('admin.users.get.error', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}
