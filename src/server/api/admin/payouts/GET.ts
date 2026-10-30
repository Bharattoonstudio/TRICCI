/** GET /api/admin/payouts — paid employer invoices, the TRICCI / consultant / GST split, amounts paid out, and totals. */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { invoicePayment, placement, consultantTransfer, user } from '@/server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { requireAdmin } from '@/server/lib/adminAuth.js';
import { consultantDuePaise, gstDuePaise, summarisePayouts } from '@/server/lib/consultantTransferMath.js';

export default async function handler(req: Request, res: Response) {
  try {
    if (!(await requireAdmin(req, res))) return;
    const paid = await db
      .select({
        placementId: invoicePayment.placementId,
        amountPaise: invoicePayment.amountPaise,
        platformPaise: invoicePayment.platformPaise,
        consultantPaise: invoicePayment.consultantPaise,
        gstPaise: invoicePayment.gstPaise,
        paidAt: invoicePayment.paidAt,
        candidateName: placement.candidateName,
        jobTitle: placement.jobTitle,
        companyName: placement.companyName,
        consultantName: user.name,
      })
      .from(invoicePayment)
      .innerJoin(placement, eq(invoicePayment.placementId, placement.id))
      .leftJoin(user, eq(placement.consultantUserId, user.id))
      .where(eq(invoicePayment.status, 'paid'));

    const ids = paid.map(p => p.placementId);
    const transfers = ids.length === 0 ? [] : await db
      .select({ placementId: consultantTransfer.placementId, amountPaise: consultantTransfer.amountPaise, gstPaise: consultantTransfer.gstPaise, reference: consultantTransfer.reference, paidAt: consultantTransfer.paidAt })
      .from(consultantTransfer)
      .where(inArray(consultantTransfer.placementId, ids));

    const rows = paid.map(p => {
      const mine = transfers.filter(t => t.placementId === p.placementId);
      const paidOutPaise = mine.reduce((sum, t) => sum + t.amountPaise, 0);
      const gstPaidPaise = mine.reduce((sum, t) => sum + t.gstPaise, 0);
      const basePaidPaise = paidOutPaise - gstPaidPaise;
      return {
        placementId: p.placementId,
        candidateName: p.candidateName,
        jobTitle: p.jobTitle,
        companyName: p.companyName,
        consultantName: p.consultantName,
        amountPaise: p.amountPaise,
        platformPaise: p.platformPaise,
        consultantPaise: p.consultantPaise,
        gstPaise: p.gstPaise,
        employerPaidAt: p.paidAt,
        paidOutPaise,
        duePaise: consultantDuePaise(p.consultantPaise, basePaidPaise),
        gstDuePaise: gstDuePaise(p.gstPaise, gstPaidPaise),
        transfers: mine.map(t => ({ amountPaise: t.amountPaise, gstPaise: t.gstPaise, reference: t.reference, paidAt: t.paidAt })),
      };
    });
    const totals = { ...summarisePayouts(rows), gstDuePaise: rows.reduce((s, r) => s + r.gstDuePaise, 0) };
    res.json({ payouts: rows, totals });
  } catch (err) {
    console.error('[admin.payouts.list] ERROR:', err);
    res.status(500).json({ error: 'Failed to load payouts' });
  }
}
