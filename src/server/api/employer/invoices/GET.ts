/** GET /api/employer/invoices — this employer's placements that have an invoice to review. */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice, placement, user } from '@/server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

const VISIBLE = ['sent_to_employer', 'sent_back', 'employer_approved', 'paid'] as const;

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer') return res.status(403).json({ error: 'Employer access required' });

    const rows = await db.select({
      placementId: consultantInvoice.placementId,
      status: consultantInvoice.status,
      totalAmountLpa: consultantInvoice.totalAmountLpa,
      gstEnabled: consultantInvoice.gstEnabled,
      candidateName: placement.candidateName,
      jobTitle: placement.jobTitle,
      consultantName: user.name,
    })
      .from(consultantInvoice)
      .innerJoin(placement, eq(consultantInvoice.placementId, placement.id))
      .leftJoin(user, eq(placement.consultantUserId, user.id))
      .where(eq(placement.employerUserId, session.user.id));

    res.json({ invoices: rows.filter(r => (VISIBLE as readonly string[]).includes(r.status)) });
  } catch (err) {
    console.error('[employer.invoices.list] ERROR:', err);
    res.status(500).json({ error: 'Failed to load invoices' });
  }
}
