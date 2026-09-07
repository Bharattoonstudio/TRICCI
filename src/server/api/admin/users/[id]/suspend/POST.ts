import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const adminRole = (session?.user as { role?: string } | null)?.role;
    if (!session || adminRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const userId = String(id);
    const [target] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role === 'admin') return res.status(400).json({ error: 'Cannot suspend an admin' });

    await db.update(user).set({ emailVerified: false }).where(eq(user.id, userId));

    res.json({ success: true, message: 'User suspended' });
  } catch (err) {
    console.error('admin.suspend.error', err);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
}
