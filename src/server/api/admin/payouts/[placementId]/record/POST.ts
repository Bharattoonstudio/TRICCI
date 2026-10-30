/**
 * POST /api/admin/payouts/:placementId/record
 * Records a manual payout TRICCI made to the consultant. Does not move money.
 * Body: { amountPaise: number, reference: string }  (reference = bank UTR or UPI ref)
 * The due amount is checked and the row locked inside a transaction, so two clicks cannot overpay.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { invoicePayment, placement, consultantTransfer } from '@/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { requireAdmin } from '@/server/lib/adminAuth.js';
import { consultantDuePaise, gstDuePaise, validateTransfer } from '@/server/lib/consultantTransferMath.js';
import { sendConsultantReceipt } from '@/server/lib/invoiceEmails.js';

export default async function handler(req: Request, res: Response) {
  try {
    const adminId = await requireAdmin(req, res);
    if (!adminId) return;
    const placementId = parseInt(String(req.params.placementId), 10);
    if (!Number.isFinite(placementId)) return res.status(400).json({ error: 'Invalid placement ID' });

    const { amountPaise, gstPaise, reference } = (req.body ?? {}) as { amountPaise?: unknown; gstPaise?: unknown; reference?: unknown };
    const ref = typeof reference === 'string' ? reference.trim() : reference;

    const outcome = await db.transaction(async (tx) => {
      const [pay] = await tx.select({ consultantPaise: invoicePayment.consultantPaise })
        .from(invoicePayment)
        .where(and(eq(invoicePayment.placementId, placementId), eq(invoicePayment.status, 'paid')))
        .limit(1)
        .for('update');
      if (!pay) return { code: 409 as const, error: 'The employer has not paid this invoice yet.' };

      const [plc] = await tx.select({ consultantUserId: placement.consultantUserId })
        .from(placement).where(eq(placement.id, placementId)).limit(1);
      if (!plc?.consultantUserId) return { code: 409 as const, error: 'This placement has no consultant.' };

      const prior = await tx.select({ amountPaise: consultantTransfer.amountPaise, gstPaise: consultantTransfer.gstPaise })
        .from(consultantTransfer).where(eq(consultantTransfer.placementId, placementId));
      const basePaid = prior.reduce((sum, t) => sum + (t.amountPaise - t.gstPaise), 0);
      const gstPaid = prior.reduce((sum, t) => sum + t.gstPaise, 0);
      const baseDue = consultantDuePaise(pay.consultantPaise, basePaid);
      const gstOwed = gstDuePaise(pay.gstPaise, gstPaid);
      const gst = gstPaise === undefined || gstPaise === null ? 0 : (gstPaise as number);

      const error = validateTransfer({ amountPaise, gstPaise: gst, reference: ref }, baseDue, gstOwed);
      if (error) return { code: 400 as const, error };

      const base = amountPaise as number;
      await tx.insert(consultantTransfer).values({
        placementId,
        consultantUserId: plc.consultantUserId,
        amountPaise: base + gst,
        gstPaise: gst,
        reference: ref as string,
        recordedByUserId: adminId,
      });
      return { code: 200 as const, duePaise: baseDue - base, gstDuePaise: gstOwed - gst, gstPaid: gst };
    });

    if (outcome.code !== 200) return res.status(outcome.code).json({ error: outcome.error });
    void sendConsultantReceipt(placementId, amountPaise as number, outcome.gstPaid, ref as string);
    console.log(`[admin.payouts.record] placement=${placementId} amount=${amountPaise} by=${adminId}`);
    res.json({ ok: true, remainingDuePaise: outcome.duePaise, remainingGstDuePaise: outcome.gstDuePaise });
  } catch (err) {
    console.error('[admin.payouts.record] ERROR:', err);
    res.status(500).json({ error: 'Failed to record payout' });
  }
}
