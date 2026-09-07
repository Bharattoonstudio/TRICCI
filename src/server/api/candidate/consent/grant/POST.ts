/**
 * POST /api/candidate/consent/grant
 * Candidate explicitly grants consent to be submitted to jobs by consultants.
 * 
 * P0 #2: Enforces that candidates must opt-in before any submission can happen
 * 
 * Request: { via?: 'email' | 'portal' | 'manual' }
 * Response: { ok: true, status: 'granted', grantedAt: ISO string }
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
      return res.status(403).json({ error: 'Only candidates can grant consent' });
    }

    const { via } = req.body as { via?: string };
    const consentVia = (via && ['email', 'portal', 'manual'].includes(via)) ? via : 'portal';

    const grantedAt = new Date();

    // Update user consent status
    const [updated] = await db
      .update(user)
      .set({
        consentStatus: 'granted',
        consentGrantedAt: grantedAt,
        consentWithdrawnAt: null, // Clear any previous withdrawal
        consentGrantedVia: consentVia,
        updatedAt: grantedAt,
      })
      .where(eq(user.id, session.user.id))
      .returning({
        id: user.id,
        consentStatus: user.consentStatus,
        consentGrantedAt: user.consentGrantedAt,
      });

    // Audit log
    await db
      .insert(auditLog)
      .values({
        userId: session.user.id,
        action: 'consent_granted',
        entityType: 'user',
        entityId: session.user.id,
        oldValue: JSON.stringify({ consentStatus: 'pending' }),
        newValue: JSON.stringify({
          consentStatus: 'granted',
          grantedAt,
          via: consentVia,
        }),
        timestamp: grantedAt,
      })
      .catch(() => {}); // Audit failure doesn't block

    res.json({
      ok: true,
      status: 'granted',
      grantedAt: grantedAt.toISOString(),
    });
  } catch (err) {
    console.error('[candidate.consent.grant] ERROR:', err);
    res.status(500).json({ error: 'Failed to grant consent' });
  }
}
