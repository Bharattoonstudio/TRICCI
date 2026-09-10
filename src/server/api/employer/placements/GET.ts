/**
 * GET /api/employer/placements
 * Point 54: employer's "Fees Settled" view — every placement for their
 * jobs, fee amount, consultant acceptance status, and payment status.
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
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const rows = role === 'employer'
      ? await db.select().from(placement).where(eq(placement.employerUserId, session.user.id)).orderBy(desc(placement.placedAt)).limit(200)
      : await db.select().from(placement).orderBy(desc(placement.placedAt)).limit(200);

    const withDueDate = rows.map(r => ({
      ...r,
      dueDate: new Date(new Date(r.placedAt!).getTime() + r.paymentTermDays * 24 * 60 * 60 * 1000).toISOString(),
    }));

    const totalFeesPaid = withDueDate.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + (r.feeAmountLpa ?? 0), 0);
    const pendingCount = withDueDate.filter(r => r.paymentStatus !== 'paid').length;

    res.json({ placements: withDueDate, totalFeesPaid, pendingCount });
  } catch (err) {
    console.error('[employer.placements.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
}
