/** GET /api/invoices/:placementId/thread — invoice summary and messages, for admin, the consultant or the employer on this placement. */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice, invoiceMessage, placement } from '@/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { resolveInvoiceViewer } from '@/server/lib/invoiceAccess.js';

export default async function handler(req: Request, res: Response) {
  try {
    const session = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const role = (session.user as { role?: string }).role;
    const placementId = parseInt(String(req.params.placementId), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const viewer = await resolveInvoiceViewer(session.user.id, role, placementId);
    if (!viewer) return res.status(403).json({ error: 'Not allowed' });

    const [plc] = await db.select({ candidateName: placement.candidateName, jobTitle: placement.jobTitle, companyName: placement.companyName })
      .from(placement).where(eq(placement.id, placementId)).limit(1);
    const [inv] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);
    if (!plc || !inv) return res.status(404).json({ error: 'Invoice not found' });

    const messages = await db.select().from(invoiceMessage)
      .where(eq(invoiceMessage.placementId, placementId))
      .orderBy(asc(invoiceMessage.createdAt));

    res.json({
      viewerRole: viewer,
      placement: plc,
      invoice: {
        status: inv.status,
        invoiceNumber: inv.invoiceNumber,
        gstEnabled: inv.gstEnabled,
        gstRatePct: inv.gstRatePct,
        feeAmountLpa: inv.feeAmountLpa,
        gstAmountLpa: inv.gstAmountLpa,
        totalAmountLpa: inv.totalAmountLpa,
        adminRemarks: inv.adminRemarks,
      },
      messages: messages.map(m => ({ id: m.id, authorRole: m.authorRole, kind: m.kind, body: m.body, createdAt: m.createdAt, mine: m.authorUserId === session.user.id })),
    });
  } catch (err) {
    console.error('[invoice.thread.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to load invoice' });
  }
}
