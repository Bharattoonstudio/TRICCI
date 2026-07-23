/**
 * PUT /api/commission/config
 * Admin-only. Updates the platform commission configuration.
 * Body: { minFeePercent, maxFeePercent, defaultFeePercent, platformFeePct, payoutDays }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { commissionConfig } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { minFeePercent, maxFeePercent, defaultFeePercent, platformFeePct, payoutDays } = req.body as {
      minFeePercent?: number; maxFeePercent?: number; defaultFeePercent?: number;
      platformFeePct?: number; payoutDays?: number;
    };

    // Validate
    if (platformFeePct !== undefined && defaultFeePercent !== undefined) {
      if (platformFeePct >= defaultFeePercent) {
        return res.status(400).json({ error: 'Platform margin must be less than the employer fee %' });
      }
    }

    // Upsert row id=1
    const existing = await db.select().from(commissionConfig).limit(1);
    if (existing.length === 0) {
      await db.insert(commissionConfig).values({
        minFeePercent: minFeePercent ?? 5,
        maxFeePercent: maxFeePercent ?? 15,
        defaultFeePercent: defaultFeePercent ?? 8,
        platformFeePct: platformFeePct ?? 2,
        payoutDays: payoutDays ?? 3,
      });
    } else {
      const update: Partial<typeof commissionConfig.$inferInsert> = {};
      if (minFeePercent !== undefined) update.minFeePercent = minFeePercent;
      if (maxFeePercent !== undefined) update.maxFeePercent = maxFeePercent;
      if (defaultFeePercent !== undefined) update.defaultFeePercent = defaultFeePercent;
      if (platformFeePct !== undefined) update.platformFeePct = platformFeePct;
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
        defaultFeePercent: cfg.defaultFeePercent,
        platformFeePct: cfg.platformFeePct,
        consultantFeePct: cfg.defaultFeePercent - cfg.platformFeePct,
        payoutDays: cfg.payoutDays,
      },
    });
  } catch (err) {
    console.error('commission.config.put.error', err);
    res.status(500).json({ error: 'Failed to save commission config' });
  }
}
