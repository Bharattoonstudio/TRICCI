/**
 * GET /api/consultant/submissions/:id/documents
 * Consultant sees the document requests for their own submission, plus
 * only the documents they themselves uploaded (not candidate uploads —
 * there shouldn't be any on a consultant submission, but this stays
 * strict regardless).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, documentRequest, documentSubmission } from '@/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const role = (session?.user as { role?: string } | null)?.role;
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const submissionId = parseInt(String(req.params.id), 10);
    if (isNaN(submissionId)) return res.status(400).json({ error: 'Invalid submission ID' });

    const [sub] = await db.select({ id: submission.id, consultantUserId: submission.consultantUserId, candidateName: submission.candidateName })
      .from(submission).where(eq(submission.id, submissionId)).limit(1);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (role === 'consultant' && sub.consultantUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your submission' });
    }

    const requests = await db.select().from(documentRequest)
      .where(and(eq(documentRequest.entityType, 'submission'), eq(documentRequest.entityId, String(submissionId))))
      .orderBy(desc(documentRequest.createdAt));

    const documents = await db.select().from(documentSubmission)
      .where(and(
        eq(documentSubmission.entityType, 'submission'),
        eq(documentSubmission.entityId, String(submissionId)),
        eq(documentSubmission.uploadedByRole, 'consultant'),
      ))
      .orderBy(desc(documentSubmission.uploadedAt));

    res.json({ requests, documents, candidateName: sub.candidateName });
  } catch (err) {
    console.error('[consultant.submissions.documents.get] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}
