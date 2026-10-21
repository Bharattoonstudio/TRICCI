/** GET /api/admin/invoices[?status=] — consultant invoices for admin review. */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice, placement, job, user } from '@/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { requireAdmin } from '@/server/lib/adminAuth.js';

export default async function handler(req: Request, res: Response) {
  try {
    if (!(await requireAdmin(req, res))) return;
    const rows = await db
      .select({
        placementId: consultantInvoice.placementId,
        status: consultantInvoice.status,
        totalAmountLpa: consultantInvoice.totalAmountLpa,
        gstEnabled: consultantInvoice.gstEnabled,
        invoiceNumber: consultantInvoice.invoiceNumber,
        submittedAt: consultantInvoice.submittedAt,
        updatedAt: consultantInvoice.updatedAt,
        candidateName: placement.candidateName,
        jobTitle: placement.jobTitle,
        companyName: placement.companyName,
        consultantName: user.name,
      })
      .from(consultantInvoice)
      .leftJoin(placement, eq(consultantInvoice.placementId, placement.id))
      .leftJoin(job, eq(placement.jobId, job.id))
      .leftJoin(user, eq(consultantInvoice.consultantUserId, user.id))
      .orderBy(desc(consultantInvoice.updatedAt))
      .limit(200);
    const status = typeof req.query.status === 'string' ? req.query.status : null;
    res.json({ invoices: status ? rows.filter(r => r.status === status) : rows });
  } catch (err) {
    console.error('[admin.invoices.list] ERROR:', err);
    res.status(500).json({ error: 'Failed to load invoices' });
  }
}
