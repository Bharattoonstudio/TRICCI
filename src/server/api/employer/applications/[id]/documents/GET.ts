/**
 * GET /api/employer/applications/:id/documents
 * Employer sees every document request and every uploaded document for
 * this direct candidate application.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { documentRequest, documentSubmission } from '@/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { resolveDocEntity } from '@/server/lib/documentEntity.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const role = (session?.user as { role?: string } | null)?.role;
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const entity = await resolveDocEntity('application', String(req.params.id));
    if (!entity) return res.status(404).json({ error: 'Application not found' });
    if (role === 'employer' && entity.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your job posting' });
    }

    const requests = await db.select().from(documentRequest)
      .where(and(eq(documentRequest.entityType, 'application'), eq(documentRequest.entityId, String(entity.id))))
      .orderBy(desc(documentRequest.createdAt));

    const documents = await db.select().from(documentSubmission)
      .where(and(eq(documentSubmission.entityType, 'application'), eq(documentSubmission.entityId, String(entity.id))))
      .orderBy(desc(documentSubmission.uploadedAt));

    res.json({ requests, documents, candidateName: entity.candidateName });
  } catch (err) {
    console.error('[employer.applications.documents.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}
