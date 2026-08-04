/**
 * GET /api/employer/placements/joining-pipeline
 * Lists every placement where the offer has been accepted — the actual
 * "Joining Tracker" list view. Scoped to placements with offerStatus =
 * 'accepted', since tracking BGV/documents/induction only makes sense
 * once someone has actually said yes to an offer.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { placement } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const rows = await db
      .select()
      .from(placement)
      .where(role === 'employer' ? and(eq(placement.employerUserId, session.user.id), eq(placement.offerStatus, 'accepted')) : eq(placement.offerStatus, 'accepted'));

    res.json({
      placements: rows.map(r => ({
        id: r.id,
        candidateName: r.candidateName,
        jobTitle: r.jobTitle,
        companyName: r.companyName,
        joiningDate: r.joiningDate,
        bgvStatus: r.bgvStatus,
        documentsChecklist: r.documentsChecklist as { label: string; received: boolean }[],
        inductionCompleted: r.inductionCompleted,
        actualJoiningConfirmed: r.actualJoiningConfirmed,
      })),
    });
  } catch (err) {
    console.error('[employer.placements.joining-pipeline] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch joining pipeline' });
  }
}
