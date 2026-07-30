// NEW FILE: src/server/api/notifications/GET.ts
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { notification } from '@/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers }).catch(() => null);
    if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    const rows = await db
      .select()
      .from(notification)
      .where(eq(notification.userId, session.user.id))
      .orderBy(desc(notification.createdAt))
      .limit(30);

    const unreadCount = rows.filter((n) => !n.read).length;

    res.json({ notifications: rows, unreadCount });
  } catch (err) {
    console.error('[GET /api/notifications] Error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}
