/** POST /api/employer/invoices/:placementId/approve — the employer approves the invoice. Payment is then allowed. */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice, placement } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { getOrgRole, canManageBilling } from '@/server/lib/orgPermissions.js';
import { canEmployerRespond, type InvoiceStatus } from '@/server/lib/invoiceStatus.js';
import { notifyAdmins } from '@/server/lib/invoiceReview.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer') return res.status(403).json({ error: 'Employer access required' });
    if (!canManageBilling(await getOrgRole(session.user.id))) {
      return res.status(403).json({ error: 'Only the organization owner or Finance role can approve invoices' });
    }

    const placementId = parseInt(String(req.params.placementId), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const [plc] = await db.select({ employerUserId: placement.employerUserId, candidateName: placement.candidateName, jobTitle: placement.jobTitle })
      .from(placement).where(eq(placement.id, placementId)).limit(1);
    if (!plc || plc.employerUserId !== session.user.id) return res.status(403).json({ error: 'Not your placement' });

    const [inv] = await db.select({ status: consultantInvoice.status }).from(consultantInvoice)
      .where(eq(consultantInvoice.placementId, placementId)).limit(1);
    if (!inv || !canEmployerRespond(inv.status as InvoiceStatus)) {
      return res.status(409).json({ error: 'This invoice is not waiting for your approval.' });
    }

    await db.update(consultantInvoice)
      .set({ status: 'employer_approved', updatedAt: new Date() })
      .where(eq(consultantInvoice.placementId, placementId));

    await notifyAdmins('invoice_employer_approved', `Employer approved the invoice for ${plc.candidateName} · ${plc.jobTitle}.`, '/admin/invoices');
    res.json({ ok: true, status: 'employer_approved' });
  } catch (err) {
    console.error('[employer.invoices.approve] ERROR:', err);
    res.status(500).json({ error: 'Failed to approve invoice' });
  }
}
