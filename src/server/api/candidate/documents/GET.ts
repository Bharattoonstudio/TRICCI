/**
 * GET /api/candidate/documents
 * Candidate sees document requests and their own uploads across both
 * consultant submissions (matched by email) and direct applications
 * (matched by account), combined into one list.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, candidateApplication, job, documentRequest, documentSubmission } from '@/server/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    // Consultant-sourced submissions (matched by email)
    const submissions = await db.select({
      id: submission.id,
      jobTitle: job.title,
      companyName: job.company,
    }).from(submission)
      .leftJoin(job, eq(submission.jobId, job.id))
      .where(eq(submission.candidateEmail, session.user.email || ''));

    // Direct applications (matched by account)
    const applications = await db.select({
      id: candidateApplication.id,
      jobTitle: job.title,
      companyName: job.company,
    }).from(candidateApplication)
      .leftJoin(job, eq(candidateApplication.jobId, job.id))
      .where(eq(candidateApplication.candidateUserId, session.user.id));

    const submissionIds = submissions.map(s => String(s.id));
    const applicationIds = applications.map(a => String(a.id));

    const requestRows = [];
    const docRows = [];

    if (submissionIds.length > 0) {
      requestRows.push(...await db.select().from(documentRequest)
        .where(and(eq(documentRequest.entityType, 'submission'), inArray(documentRequest.entityId, submissionIds))));
      docRows.push(...await db.select().from(documentSubmission)
        .where(and(
          eq(documentSubmission.entityType, 'submission'),
          inArray(documentSubmission.entityId, submissionIds),
          eq(documentSubmission.uploadedByRole, 'candidate'),
        )));
    }
    if (applicationIds.length > 0) {
      requestRows.push(...await db.select().from(documentRequest)
        .where(and(eq(documentRequest.entityType, 'application'), inArray(documentRequest.entityId, applicationIds))));
      docRows.push(...await db.select().from(documentSubmission)
        .where(and(
          eq(documentSubmission.entityType, 'application'),
          inArray(documentSubmission.entityId, applicationIds),
          eq(documentSubmission.uploadedByRole, 'candidate'),
        )));
    }

    const entityMeta = new Map<string, { jobTitle: string | null; companyName: string | null }>();
    submissions.forEach(s => entityMeta.set(`submission:${s.id}`, { jobTitle: s.jobTitle, companyName: s.companyName }));
    applications.forEach(a => entityMeta.set(`application:${a.id}`, { jobTitle: a.jobTitle, companyName: a.companyName }));

    const requests = requestRows.map(r => ({ ...r, ...entityMeta.get(`${r.entityType}:${r.entityId}`) }));
    const documents = docRows.map(d => ({ ...d, ...entityMeta.get(`${d.entityType}:${d.entityId}`) }));

    res.json({ requests, documents });
  } catch (err) {
    console.error('[candidate.documents.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}
