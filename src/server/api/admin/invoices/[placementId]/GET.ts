/** GET /api/admin/invoices/:placementId — one invoice with its placement and job journey. */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { consultantInvoice, placement } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/server/lib/adminAuth.js';
import { getJourneys } from '@/server/lib/invoiceJourney.js';

export default async function handler(req: Request, res: Response) {
  try {
    if (!(await requireAdmin(req, res))) return;
    const placementId = parseInt(String(req.params.placementId), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });
    const [invoice] = await db.select().from(consultantInvoice).where(eq(consultantInvoice.placementId, placementId)).limit(1);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const [plc] = await db.select().from(placement).where(eq(placement.id, placementId)).limit(1);
    const journey = plc?.jobId ? (await getJourneys(plc.jobId))[0] ?? null : null;
    res.json({ invoice, placement: plc ?? null, journey });
  } catch (err) {
    console.error('[admin.invoices.detail] ERROR:', err);
    res.status(500).json({ error: 'Failed to load invoice' });
  }
}
