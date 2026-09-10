/**
 * POST /api/employer/submissions/:id/documents/request
 * Employer asks for documents (PAN, payslips, relieving letter, etc.)
 * once a candidate is shortlisted/selected. This is consultant-sourced,
 * so only the consultant is notified — the candidate is not contacted
 * directly, matching how the rest of the platform keeps the consultant
 * relationship intact.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { documentRequest, notification } from '@/server/db/schema.js';
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

    const { documentLabels, message } = req.body as { documentLabels?: string[]; message?: string };
    if (!Array.isArray(documentLabels) || documentLabels.length === 0 || documentLabels.some(l => !l?.trim())) {
      return res.status(400).json({ error: 'At least one document label is required' });
    }

    const entity = await resolveDocEntity('submission', String(req.params.id));
    if (!entity) return res.status(404).json({ error: 'Submission not found' });
    if (role === 'employer' && entity.postedByUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your submission' });
    }

    const [request] = await db.insert(documentRequest).values({
      entityType: 'submission',
      entityId: String(entity.id),
      requestedByUserId: session.user.id,
      documentLabels,
      message: message?.trim() || null,
      status: 'pending',
    }).returning();

    if (entity.consultantUserId) {
      await db.insert(notification).values({
        userId: entity.consultantUserId,
        type: 'document_request',
        message: `Documents requested for ${entity.candidateName}: ${documentLabels.join(', ')}`,
        link: `/consultant/dashboard`,
      }).catch(() => {});
    }

    res.status(201).json({ ok: true, request });
  } catch (err) {
    console.error('[employer.submissions.documents.request] ERROR:', err);
    res.status(500).json({ error: 'Failed to create document request' });
  }
}
