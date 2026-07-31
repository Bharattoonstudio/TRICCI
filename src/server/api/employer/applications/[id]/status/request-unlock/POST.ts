/**
 * POST /api/employer/applications/:id/request-unlock
 * Employer requests real contact details for a shortlisted, masked direct
 * candidate application. Does NOT unlock anything itself — files a request
 * for Admin to review and release only after payment is confirmed (points 11-12).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateApplication, job, contactUnlockRequest, user, notification } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Employer access required' });
    }

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid application ID' });

    const [row] = await db
      .select({
        appId: candidateApplication.id,
        status: candidateApplication.status,
        candidateUserId: candidateApplication.candidateUserId,
        jobTitle: job.title,
        postedByUserId: job.postedByUserId,
      })
      .from(candidateApplication)
      .innerJoin(job, eq(candidateApplication.jobId, job.id))
      .where(
        role === 'employer'
          ? and(eq(candidateApplication.id, id), eq(job.postedByUserId, session.user.id))
          : eq(candidateApplication.id, id),
      )
      .limit(1);

    if (!row) return res.status(404).json({ error: 'Application not found' });
    if (row.status !== 'shortlisted') {
      return res.status(400).json({ error: 'Only shortlisted candidates can have their contact unlocked' });
    }

    // Avoid duplicate pending requests for the same application
    const [existing] = await db
      .select({ id: contactUnlockRequest.id })
      .from(contactUnlockRequest)
      .where(and(eq(contactUnlockRequest.applicationId, id), eq(contactUnlockRequest.status, 'pending')))
      .limit(1);

    if (!existing) {
      await db.insert(contactUnlockRequest).values({
        applicationId: id,
        employerUserId: row.postedByUserId!,
        candidateUserId: row.candidateUserId,
      });

      // Notify all admins
      const admins = await db.select({ id: user.id }).from(user).where(eq(user.role, 'admin'));
      for (const admin of admins) {
        await db.insert(notification).values({
          userId: admin.id,
          type: 'contact_unlock_request',
          message: `Contact unlock requested for ${row.jobTitle} application`,
          link: '/admin',
        }).catch(() => {});
      }
    }

    res.json({ ok: true, requested: true });
  } catch (err) {
    console.error('[employer.applications.request-unlock] ERROR:', err);
    res.status(500).json({ error: 'Failed to request contact unlock' });
  }
}
