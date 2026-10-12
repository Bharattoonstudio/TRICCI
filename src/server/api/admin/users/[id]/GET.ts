/**
 * GET /api/admin/users/:id
 * Admin only. Full read-only details for one account, for the admin user-details popup.
 *
 * Returns:
 *  - user: account fields and candidate consent status
 *  - profile: the row from the role's profile table (candidate / employer / consultant), or null
 *  - activity: last sign-in, active sessions, jobs posted, applications submitted
 *
 * Never returns passwords, session tokens or IP addresses.
 */
import type { Request, Response } from 'express';
import { and, count, eq, gt, max } from 'drizzle-orm';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { db } from '@/server/db/client.js';
import {
  user,
  session,
  job,
  candidateApplication,
  candidateProfile,
  employerProfile,
  consultantProfile,
} from '@/server/db/schema.js';

export default async function handler(req: Request, res: Response) {
  try {
    const authSession = await getAuth().api.getSession({ headers: toWebRequest(req).headers });
    if (!authSession) return res.status(401).json({ error: 'Unauthorized' });
    if ((authSession.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const id = String(req.params.id ?? '');
    if (!id || id.length > 64) return res.status(400).json({ error: 'Invalid user id' });

    const [account] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        consentStatus: user.consentStatus,
        consentGrantedAt: user.consentGrantedAt,
        consentWithdrawnAt: user.consentWithdrawnAt,
        consentGrantedVia: user.consentGrantedVia,
        suspendedAt: user.suspendedAt,
        removedAt: user.removedAt,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!account) return res.status(404).json({ error: 'User not found' });

    let profile: Record<string, unknown> | null = null;
    if (account.role === 'candidate') {
      const [row] = await db.select().from(candidateProfile).where(eq(candidateProfile.userId, id)).limit(1);
      profile = row ?? null;
    } else if (account.role === 'employer') {
      const [row] = await db.select().from(employerProfile).where(eq(employerProfile.userId, id)).limit(1);
      profile = row ?? null;
    } else if (account.role === 'consultant') {
      const [row] = await db.select().from(consultantProfile).where(eq(consultantProfile.userId, id)).limit(1);
      profile = row ?? null;
    }

    const [lastSignIn, activeSessions, jobsPosted, applications] = await Promise.all([
      db.select({ value: max(session.createdAt) }).from(session).where(eq(session.userId, id)),
      db
        .select({ value: count() })
        .from(session)
        .where(and(eq(session.userId, id), gt(session.expiresAt, new Date()))),
      db.select({ value: count() }).from(job).where(eq(job.postedByUserId, id)),
      db.select({ value: count() }).from(candidateApplication).where(eq(candidateApplication.candidateUserId, id)),
    ]);

    return res.status(200).json({
      user: account,
      profile,
      activity: {
        lastSignIn: lastSignIn[0]?.value ?? null,
        activeSessions: Number(activeSessions[0]?.value ?? 0),
        jobsPosted: Number(jobsPosted[0]?.value ?? 0),
        applications: Number(applications[0]?.value ?? 0),
      },
    });
  } catch (error) {
    console.error('[admin/users/:id] error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not load user details' });
  }
}
