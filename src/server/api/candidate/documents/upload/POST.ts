/**
 * POST /api/candidate/documents/upload
 * Candidate uploads a document directly. Accepts multipart/form-data:
 * "file", "label", "entityType" ('submission'|'application'), "entityId",
 * optional "requestId". Visible to {candidate, employer} only.
 */
import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { db } from '@/server/db/client.js';
import { submission, candidateApplication, documentSubmission, documentRequest } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { isValidEntityType } from '@/server/lib/documentEntity.js';

const DOC_DIR = '/shared-storage/public/assets/submission-docs';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png', 'image/jpeg', 'image/webp',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, or image files are accepted.'));
  },
});

export const multerMiddleware = upload.single('file');

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const { label, requestId, entityType, entityId } = req.body as {
      label?: string; requestId?: string; entityType?: string; entityId?: string;
    };
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!label?.trim()) return res.status(400).json({ error: 'A document label is required' });
    if (!file) return res.status(400).json({ error: 'A file is required' });
    if (!isValidEntityType(entityType) || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    const numericEntityId = parseInt(entityId, 10);
    if (isNaN(numericEntityId)) return res.status(400).json({ error: 'Invalid entityId' });

    // Ownership check — candidate must own this submission (by email) or application (by account)
    if (entityType === 'submission') {
      const [sub] = await db.select({ id: submission.id, candidateEmail: submission.candidateEmail })
        .from(submission).where(eq(submission.id, numericEntityId)).limit(1);
      if (!sub) return res.status(404).json({ error: 'Submission not found' });
      if (sub.candidateEmail !== session.user.email) return res.status(403).json({ error: 'Not your submission' });
    } else {
      const [app] = await db.select({ id: candidateApplication.id, candidateUserId: candidateApplication.candidateUserId })
        .from(candidateApplication).where(eq(candidateApplication.id, numericEntityId)).limit(1);
      if (!app) return res.status(404).json({ error: 'Application not found' });
      if (app.candidateUserId !== session.user.id) return res.status(403).json({ error: 'Not your application' });
    }

    await fs.mkdir(DOC_DIR, { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${session.user.id}-${safeName}`;
    await fs.writeFile(path.join(DOC_DIR, filename), file.buffer);
    const fileUrl = `/airo-assets/uploads/submission-docs/${filename}`;

    const [doc] = await db.insert(documentSubmission).values({
      entityType,
      entityId: String(numericEntityId),
      requestId: requestId ? parseInt(requestId, 10) : null,
      uploadedByUserId: session.user.id,
      uploadedByRole: 'candidate',
      documentLabel: label.trim(),
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
    }).returning();

    if (requestId) {
      await db.update(documentRequest).set({ status: 'completed', updatedAt: new Date() })
        .where(and(eq(documentRequest.id, parseInt(requestId, 10)), eq(documentRequest.entityType, entityType)))
        .catch(() => {});
    }

    res.status(201).json({ ok: true, document: doc });
  } catch (err) {
    console.error('[candidate.documents.upload] ERROR:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
}
