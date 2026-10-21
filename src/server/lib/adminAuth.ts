/** Returns the admin user id, or null after sending the error response. */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export async function requireAdmin(req: Request, res: Response): Promise<string | null> {
  const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
  const role = (session?.user as { role?: string } | null)?.role;
  if (!session) { res.status(401).json({ error: 'Unauthorized' }); return null; }
  if (role !== 'admin') { res.status(403).json({ error: 'Admin access required' }); return null; }
  return session.user.id;
}
