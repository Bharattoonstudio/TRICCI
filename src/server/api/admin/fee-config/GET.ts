/**
 * GET /api/admin/fee-config
 * Fetch current fee configuration. Only admins can view.
 * 
 * P0 #4: Replaces hardcoded PLATFORM_CUT = 2 with configurable value
 * 
 * Response:
 * {
 *   ok: true,
 *   config: {
 *     id: number,
 *     minFeePercent: number,
 *     maxFeePercent: number,
 *     defaultFeePercent: number,
 *     platformFeePct: number,  // What TRICCI keeps
 *     payoutDays: number,      // Payout SLA (days)
 *     updatedAt: ISO string
 *   }
 * }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { commissionConfig } from '@/server/db/schema.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });

    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    // P0 #4: Admin-only access
    const isAdmin = (session.user as { isAdmin?: boolean } | null)?.isAdmin ?? false;
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Fetch current config (should always be single row)
    const [config] = await db
      .select()
      .from(commissionConfig)
      .limit(1);

    if (!config) {
      return res.status(404).json({ error: 'Fee configuration not found' });
    }

    res.json({
      ok: true,
      config: {
        id: config.id,
        minFeePercent: config.minFeePercent,
        maxFeePercent: config.maxFeePercent,
        defaultFeePercent: config.defaultFeePercent,
        platformFeePct: config.platformFeePct, // ← This replaces hardcoded PLATFORM_CUT
        payoutDays: config.payoutDays,
        updatedAt: config.updatedAt?.toISOString() || null,
      },
    });
  } catch (err) {
    console.error('[admin.fee-config.GET] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch fee configuration' });
  }
}
