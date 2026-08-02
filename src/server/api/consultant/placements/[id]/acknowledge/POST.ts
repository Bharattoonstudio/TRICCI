/**
 * POST /api/consultant/placements/:id/acknowledge
 * Point 55: consultant confirms/acknowledges they received the placement
 * fee payment. Only allowed once the placement is actually marked paid.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid placement ID' });

    const [row] = await db.select().from(placement).where(eq(placement.id, id)).limit(1);
    if (!row) return res.status(404).json({ error: 'Placement not found' });
    if (role === 'consultant' && row.consultantUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your placement' });
    }
    if (row.paymentStatus !== 'paid') {
      return res.status(400).json({ error: 'Cannot acknowledge — payment has not been marked as paid yet' });
    }

    await db.update(placement).set({ consultantAcknowledgedAt: new Date() }).where(eq(placement.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error('[consultant.placements.acknowledge] ERROR:', err);
    res.status(500).json({ error: 'Failed to acknowledge payment' });
  }
}
