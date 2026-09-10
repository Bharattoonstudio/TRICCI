/**
 * POST /api/candidate/consent/withdraw
 * Candidate revokes consent to be submitted to jobs.
 * 
 * P0 #2: Once withdrawn, no new submissions can happen
 * (Existing submissions remain but new ones blocked)
 * 
 * Request: { reason?: string }
 * Response: { ok: true, status: 'withdrawn', withdrawnAt: ISO string }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { user, auditLog } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;

    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'candidate') {
      return res.status(403).json({ error: 'Only candidates can withdraw consent' });
    }

    const { reason } = req.body as { reason?: string };
    const withdrawnAt = new Date();

    // Get current state before update (for audit)
    const [before] = await db
      .select({
        consentStatus: user.consentStatus,
        consentGrantedAt: user.consentGrantedAt,
      })
      .from(user)
      .where(eq(user.id, session.user.id));

    // Update user consent status
    const [updated] = await db
      .update(user)
      .set({
        consentStatus: 'withdrawn',
        consentWithdrawnAt: withdrawnAt,
        updatedAt: withdrawnAt,
      })
      .where(eq(user.id, session.user.id))
      .returning({
        id: user.id,
        consentStatus: user.consentStatus,
        consentWithdrawnAt: user.consentWithdrawnAt,
      });

    // Audit log with reason
    await db
      .insert(auditLog)
      .values({
        userId: session.user.id,
        action: 'consent_withdrawn',
        entityType: 'user',
        entityId: session.user.id,
        oldValue: JSON.stringify({
          consentStatus: before?.consentStatus || 'pending',
        }),
        newValue: JSON.stringify({
          consentStatus: 'withdrawn',
          withdrawnAt,
          reason: reason || null,
        }),
        timestamp: withdrawnAt,
      })
      .catch(() => {}); // Audit failure doesn't block

    console.log(
      `[Consent] Candidate ${session.user.id} withdrew consent at ${withdrawnAt.toISOString()}${
        reason ? ` — Reason: ${reason}` : ''
      }`
    );

    res.json({
      ok: true,
      status: 'withdrawn',
      withdrawnAt: withdrawnAt.toISOString(),
    });
  } catch (err) {
    console.error('[candidate.consent.withdraw] ERROR:', err);
    res.status(500).json({ error: 'Failed to withdraw consent' });
  }
}
