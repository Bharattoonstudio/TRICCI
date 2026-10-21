/**
 * PUT /api/commission/config
 * Admin-only. Updates the platform commission configuration.
 * Body: { minFeePercent, maxFeePercent, defaultFeePercent, payoutDays, minFeeAmountRupees }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { commissionConfig } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { CONSULTANT_SHARE_PCT_FREE } from '@/server/lib/employerFee.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { minFeePercent, maxFeePercent, defaultFeePercent, payoutDays, minFeeAmountRupees } = req.body as {
      minFeePercent?: number; maxFeePercent?: number; defaultFeePercent?: number;
      payoutDays?: number; minFeeAmountRupees?: number;
    };

    if (minFeeAmountRupees !== undefined && (!Number.isInteger(minFeeAmountRupees) || minFeeAmountRupees <= 0)) {
      return res.status(400).json({ error: 'Minimum fixed fee must be a whole rupee amount above zero' });
    }

    // Upsert row id=1
    const existing = await db.select().from(commissionConfig).limit(1);
    if (existing.length === 0) {
      await db.insert(commissionConfig).values({
        minFeePercent: minFeePercent ?? 5,
        maxFeePercent: maxFeePercent ?? 35,
        minFeeAmountRupees: minFeeAmountRupees ?? 50000,
        defaultFeePercent: defaultFeePercent ?? 8,
        payoutDays: payoutDays ?? 3,
      });
    } else {
      const update: Partial<typeof commissionConfig.$inferInsert> = {};
      if (minFeePercent !== undefined) update.minFeePercent = minFeePercent;
      if (maxFeePercent !== undefined) update.maxFeePercent = maxFeePercent;
      if (minFeeAmountRupees !== undefined) update.minFeeAmountRupees = minFeeAmountRupees;
      if (defaultFeePercent !== undefined) update.defaultFeePercent = defaultFeePercent;
      if (payoutDays !== undefined) update.payoutDays = payoutDays;
      await db.update(commissionConfig).set(update).where(eq(commissionConfig.id, existing[0].id));
    }

    const updated = await db.select().from(commissionConfig).limit(1);
    const cfg = updated[0];
    res.json({
      success: true,
      config: {
        minFeePercent: cfg.minFeePercent,
        maxFeePercent: cfg.maxFeePercent,
        minFeeAmountRupees: cfg.minFeeAmountRupees,
        defaultFeePercent: cfg.defaultFeePercent,
        consultantFeePct: (cfg.defaultFeePercent * CONSULTANT_SHARE_PCT_FREE) / 100,
        payoutDays: cfg.payoutDays,
      },
    });
  } catch (err) {
    console.error('commission.config.put.error', err);
    res.status(500).json({ error: 'Failed to save commission config' });
  }
}
