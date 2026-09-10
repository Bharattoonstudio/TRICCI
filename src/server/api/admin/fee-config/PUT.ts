/**
 * PUT /api/admin/fee-config
 * Update fee configuration. Only admins can modify.
 * 
 * P0 #4: Allows dynamic fee configuration without code changes
 * 
 * Request:
 * {
 *   minFeePercent?: number,
 *   maxFeePercent?: number,
 *   defaultFeePercent?: number,
 *   platformFeePct?: number,    // What TRICCI keeps (e.g., 2%)
 *   payoutDays?: number         // Payout SLA in business days
 * }
 * 
 * Response:
 * {
 *   ok: true,
 *   config: { ...updated config },
 *   changes: {
 *     platformFeePct: { old: 2, new: 3 }  // Only changed fields
 *   }
 * }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { commissionConfig, auditLog } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { invalidateFeeCache } from '@/server/lib/feeConfig.js';

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

    const {
      minFeePercent,
      maxFeePercent,
      defaultFeePercent,
      platformFeePct,
      payoutDays,
    } = req.body as {
      minFeePercent?: number;
      maxFeePercent?: number;
      defaultFeePercent?: number;
      platformFeePct?: number;
      payoutDays?: number;
    };

    // Fetch current config for validation and audit trail
    const [currentConfig] = await db
      .select()
      .from(commissionConfig)
      .limit(1);

    if (!currentConfig) {
      return res.status(404).json({ error: 'Fee configuration not found' });
    }

    // Validate ranges if provided
    if (minFeePercent !== undefined && minFeePercent < 0) {
      return res.status(400).json({ error: 'minFeePercent must be >= 0' });
    }
    if (maxFeePercent !== undefined && maxFeePercent > 100) {
      return res.status(400).json({ error: 'maxFeePercent must be <= 100' });
    }
    if (platformFeePct !== undefined && (platformFeePct < 0 || platformFeePct > 100)) {
      return res.status(400).json({ error: 'platformFeePct must be between 0 and 100' });
    }
    if (payoutDays !== undefined && payoutDays < 1) {
      return res.status(400).json({ error: 'payoutDays must be >= 1' });
    }

    // Ensure min < max if both provided
    const newMin = minFeePercent ?? currentConfig.minFeePercent;
    const newMax = maxFeePercent ?? currentConfig.maxFeePercent;
    if (newMin > newMax) {
      return res.status(400).json({ error: 'minFeePercent must be <= maxFeePercent' });
    }

    // Ensure default is within range
    const newDefault = defaultFeePercent ?? currentConfig.defaultFeePercent;
    if (newDefault < newMin || newDefault > newMax) {
      return res.status(400).json({
        error: 'defaultFeePercent must be between minFeePercent and maxFeePercent',
      });
    }

    // Track changes for audit
    const changes: Record<string, { old: any; new: any }> = {};
    if (minFeePercent !== undefined && minFeePercent !== currentConfig.minFeePercent) {
      changes.minFeePercent = { old: currentConfig.minFeePercent, new: minFeePercent };
    }
    if (maxFeePercent !== undefined && maxFeePercent !== currentConfig.maxFeePercent) {
      changes.maxFeePercent = { old: currentConfig.maxFeePercent, new: maxFeePercent };
    }
    if (
      defaultFeePercent !== undefined &&
      defaultFeePercent !== currentConfig.defaultFeePercent
    ) {
      changes.defaultFeePercent = {
        old: currentConfig.defaultFeePercent,
        new: defaultFeePercent,
      };
    }
    if (platformFeePct !== undefined && platformFeePct !== currentConfig.platformFeePct) {
      changes.platformFeePct = { old: currentConfig.platformFeePct, new: platformFeePct };
    }
    if (payoutDays !== undefined && payoutDays !== currentConfig.payoutDays) {
      changes.payoutDays = { old: currentConfig.payoutDays, new: payoutDays };
    }

    // If no changes, return current config
    if (Object.keys(changes).length === 0) {
      return res.json({
        ok: true,
        message: 'No changes provided',
        config: currentConfig,
        changes: {},
      });
    }

    // Update configuration
    const updatedAt = new Date();
    const [updated] = await db
      .update(commissionConfig)
      .set({
        minFeePercent: minFeePercent ?? currentConfig.minFeePercent,
        maxFeePercent: maxFeePercent ?? currentConfig.maxFeePercent,
        defaultFeePercent: defaultFeePercent ?? currentConfig.defaultFeePercent,
        platformFeePct: platformFeePct ?? currentConfig.platformFeePct,
        payoutDays: payoutDays ?? currentConfig.payoutDays,
        updatedAt,
      })
      .where(eq(commissionConfig.id, currentConfig.id))
      .returning();

    // Audit log the change
    await db
      .insert(auditLog)
      .values({
        userId: session.user.id,
        action: 'fee_config_updated',
        entityType: 'commission_config',
        entityId: String(currentConfig.id),
        oldValue: JSON.stringify({
          minFeePercent: currentConfig.minFeePercent,
          maxFeePercent: currentConfig.maxFeePercent,
          defaultFeePercent: currentConfig.defaultFeePercent,
          platformFeePct: currentConfig.platformFeePct,
          payoutDays: currentConfig.payoutDays,
        }),
        newValue: JSON.stringify({
          minFeePercent: updated.minFeePercent,
          maxFeePercent: updated.maxFeePercent,
          defaultFeePercent: updated.defaultFeePercent,
          platformFeePct: updated.platformFeePct,
          payoutDays: updated.payoutDays,
        }),
        timestamp: updatedAt,
      })
      .catch(() => {}); // Audit failure doesn't block

    // P0 #4: Invalidate cache so new config is picked up immediately
    invalidateFeeCache();

    console.log(
      `[P0#4] Fee configuration updated by ${session.user.id}: ${Object.keys(changes).join(', ')}`
    );

    res.json({
      ok: true,
      message: 'Fee configuration updated',
      config: {
        id: updated.id,
        minFeePercent: updated.minFeePercent,
        maxFeePercent: updated.maxFeePercent,
        defaultFeePercent: updated.defaultFeePercent,
        platformFeePct: updated.platformFeePct,
        payoutDays: updated.payoutDays,
        updatedAt: updated.updatedAt?.toISOString() || null,
      },
      changes,
    });
  } catch (err) {
    console.error('[admin.fee-config.PUT] ERROR:', err);
    res.status(500).json({ error: 'Failed to update fee configuration' });
  }
}
