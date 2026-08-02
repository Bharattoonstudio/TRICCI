/**
 * GET /api/consultant/placements
 * Points 48, 53: consultant sees their placements — offered CTC, calculated
 * fee, acceptance status, and payment/settlement status ("Remuneration Paid").
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement } from '@/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const rows = role === 'consultant'
      ? await db.select().from(placement).where(eq(placement.consultantUserId, session.user.id)).orderBy(desc(placement.placedAt)).limit(200)
      : await db.select().from(placement).orderBy(desc(placement.placedAt)).limit(200);

    const withDueDate = rows.map(r => ({
      ...r,
      dueDate: new Date(new Date(r.placedAt!).getTime() + r.paymentTermDays * 24 * 60 * 60 * 1000).toISOString(),
    }));

    res.json({ placements: withDueDate });
  } catch (err) {
    console.error('[consultant.placements.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
}
