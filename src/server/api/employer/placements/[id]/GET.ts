/**
 * GET /api/employer/placements/:id
 * Fetch placement details.
 * 
 * P0 #5: Authorization checks ensure user owns this placement
 * 
 * Access:
 * - Employer: can view placements they created (posted the job)
 * - Consultant: can view placements where they are the consultant
 * - Admin: can view any placement
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

    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const userId = session.user.id;
    const isAdmin = (session.user as { isAdmin?: boolean } | null)?.isAdmin ?? false;

    const placementId = parseInt(String(req.params.id), 10);
    if (isNaN(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    // P0 #5: Fetch placement
    const [plc] = await db
      .select()
      .from(placement)
      .where(eq(placement.id, placementId))
      .limit(1);

    if (!plc) return res.status(404).json({ error: 'Placement not found' });

    // P0 #5: Authorization checks
    if (!isAdmin) {
      const isEmployer = plc.employerUserId === userId;
      const isConsultant = plc.consultantUserId === userId;

      if (!isEmployer && !isConsultant) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have access to this placement',
        });
      }
    }

    res.json({
      ok: true,
      placement: {
        id: plc.id,
        submissionId: plc.submissionId,
        jobId: plc.jobId,
        jobTitle: plc.jobTitle,
        companyName: plc.companyName,
        candidateName: plc.candidateName,
        candidateEmail: plc.candidateEmail,
        consultantUserId: plc.consultantUserId,
        consultantName: plc.consultantName,
        employerUserId: plc.employerUserId,
        ctcLpa: plc.ctcLpa,
        feePercent: plc.feePercent,
        feeAmountLpa: plc.feeAmountLpa,
        platformFeePercent: plc.platformFeePercent,
        consultantFeePercent: plc.consultantFeePercent,
        consultantFeeAmountLpa: plc.consultantFeeAmountLpa,
        paymentTermDays: plc.paymentTermDays,
        paymentStatus: plc.paymentStatus,
        placedAt: plc.placedAt,
        offerStatus: plc.offerStatus,
      },
    });
  } catch (err) {
    console.error('[placements.GET] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch placement' });
  }
}
