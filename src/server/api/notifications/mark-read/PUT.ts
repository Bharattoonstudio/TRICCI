// NEW FILE: src/server/api/notifications/mark-read/PUT.ts
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { notification } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers }).catch(() => null);
    if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

    // Body: { id?: number } — if id omitted, marks ALL of this user's notifications as read
    const { id } = req.body as { id?: number };

    if (id) {
      await db.update(notification)
        .set({ read: true })
        .where(and(eq(notification.id, id), eq(notification.userId, session.user.id)));
    } else {
      await db.update(notification)
        .set({ read: true })
        .where(eq(notification.userId, session.user.id));
    }

    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('[PUT /api/notifications/mark-read] Error:', err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
}
