/**
 * GET /api/commission/config
 * Returns the live commission configuration.
 * Public endpoint — consultant dashboard reads this to show the correct fee %.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { commissionConfig } from '@/server/db/schema.js';
import { CONSULTANT_SHARE_PCT_FREE } from '@/server/lib/employerFee.js';

// Seed defaults if the table is empty
async function getOrSeedConfig() {
  const rows = await db.select().from(commissionConfig).limit(1);
  if (rows.length > 0) return rows[0];
  // Insert default row
  await db.insert(commissionConfig).values({
    minFeePercent: 5,
    maxFeePercent: 35,
    minFeeAmountRupees: 50000,
    defaultFeePercent: 8,
    payoutDays: 3,
  });
  const seeded = await db.select().from(commissionConfig).limit(1);
  return seeded[0];
}

export default async function handler(_req: Request, res: Response) {
  try {
    const config = await getOrSeedConfig();
    // Consultant keeps 80% of the placement fee; the platform keeps 20%.
    const consultantFeePct = (config.defaultFeePercent * CONSULTANT_SHARE_PCT_FREE) / 100;
    res.json({
      minFeePercent: config.minFeePercent,
      maxFeePercent: config.maxFeePercent,
      minFeeAmountRupees: config.minFeeAmountRupees,
      defaultFeePercent: config.defaultFeePercent,
      consultantFeePct,
      payoutDays: config.payoutDays,
    });
  } catch (err) {
    console.error('commission.config.get.error', err);
    res.status(500).json({ error: 'Failed to load commission config' });
  }
}
