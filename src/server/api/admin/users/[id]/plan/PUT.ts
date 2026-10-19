/**
 * PUT /api/admin/users/:id/plan
 * Admin only. Sets a consultant's plan: 'free' (80% of placement fee) or 'pro' (85%).
 *
 * Body: { plan: 'free' | 'pro', reason: string }  (reason: 5 to 500 characters, stored in the audit log)
 * Applies to placements made from now on. Existing placements keep the split they were created with.
 */
import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { db } from '@/server/db/client.js';
import { user, consultantProfile, auditLog } from '@/server/db/schema.js';

const PLANS = ['free', 'pro'] as const;

export default async function handler(req: Request, res: Response) {
  try {
    const authSession = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!authSession) return res.status(401).json({ error: 'Unauthorized' });
    const actor = authSession.user as { id: string; role?: string };
    if (actor.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    const id = String(req.params.id ?? '');
    if (!id || id.length > 64) return res.status(400).json({ error: 'Invalid user id' });

    const plan = req.body?.plan;
    if (!PLANS.includes(plan)) return res.status(400).json({ error: "plan must be 'free' or 'pro'" });

    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (reason.length < 5 || reason.length > 500) {
      return res.status(400).json({ error: 'Please give a reason (5 to 500 characters)' });
    }

    const [target] = await db.select({ id: user.id, role: user.role }).from(user).where(eq(user.id, id)).limit(1);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role !== 'consultant') return res.status(400).json({ error: 'Plans apply to consultant accounts only' });

    const [before] = await db.select({ plan: consultantProfile.plan })
      .from(consultantProfile).where(eq(consultantProfile.userId, id)).limit(1);
    if (!before) return res.status(404).json({ error: 'Consultant profile not found' });

    await db.update(consultantProfile).set({ plan }).where(eq(consultantProfile.userId, id));
    await db.insert(auditLog).values({
      entityType: 'user',
      entityId: id,
      action: 'plan_change',
      actorUserId: actor.id,
      actorRole: 'admin',
      metadata: { from: before.plan, to: plan, reason },
    });

    return res.status(200).json({ message: `Plan set to ${plan}. Applies to placements made from now on.` });
  } catch (error) {
    console.error('[admin/users/:id/plan] error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not change this plan' });
  }
}
