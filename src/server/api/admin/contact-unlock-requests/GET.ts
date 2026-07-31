/**
 * GET /api/admin/contact-unlock-requests
 * Admin-only. Lists pending contact unlock requests with enough context to
 * decide (candidate name, job, employer) before releasing real contact info.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { contactUnlockRequest, candidateApplication, job, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { alias } from 'drizzle-orm/pg-core';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const employerUser = alias(user, 'employer_user');
    const candidateUser = alias(user, 'candidate_user');

    const rows = await db
      .select({
        id: contactUnlockRequest.id,
        applicationId: contactUnlockRequest.applicationId,
        status: contactUnlockRequest.status,
        createdAt: contactUnlockRequest.createdAt,
        jobTitle: job.title,
        company: job.company,
        employerName: employerUser.name,
        employerEmail: employerUser.email,
        candidateName: candidateUser.name,
      })
      .from(contactUnlockRequest)
      .innerJoin(candidateApplication, eq(contactUnlockRequest.applicationId, candidateApplication.id))
      .innerJoin(job, eq(candidateApplication.jobId, job.id))
      .innerJoin(employerUser, eq(contactUnlockRequest.employerUserId, employerUser.id))
      .innerJoin(candidateUser, eq(contactUnlockRequest.candidateUserId, candidateUser.id))
      .where(eq(contactUnlockRequest.status, 'pending'))
      .orderBy(contactUnlockRequest.createdAt);

    res.json({ requests: rows });
  } catch (err) {
    console.error('[admin.contact-unlock-requests.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch unlock requests' });
  }
}
