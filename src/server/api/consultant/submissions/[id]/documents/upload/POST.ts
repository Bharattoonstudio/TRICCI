/**
 * POST /api/consultant/submissions/:id/documents/upload
 * Consultant uploads a document (PAN, payslip, etc.) on behalf of their
 * candidate. Accepts multipart/form-data: "file", "label", optional
 * "requestId". Visible to {consultant, employer} only.
 */
import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { db } from '@/server/db/client.js';
import { submission, documentSubmission, documentRequest, notification } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

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
    const role = (session?.user as { role?: string } | null)?.role;
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const submissionId = parseInt(String(req.params.id), 10);
    if (isNaN(submissionId)) return res.status(400).json({ error: 'Invalid submission ID' });

    const { label, requestId } = req.body as { label?: string; requestId?: string };
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!label?.trim()) return res.status(400).json({ error: 'A document label is required' });
    if (!file) return res.status(400).json({ error: 'A file is required' });

    const [sub] = await db.select({ id: submission.id, consultantUserId: submission.consultantUserId })
      .from(submission).where(eq(submission.id, submissionId)).limit(1);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (role === 'consultant' && sub.consultantUserId !== session.user.id) {
      return res.status(403).json({ error: 'Not your submission' });
    }

    await fs.mkdir(DOC_DIR, { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${session.user.id}-${safeName}`;
    await fs.writeFile(path.join(DOC_DIR, filename), file.buffer);
    const fileUrl = `/airo-assets/uploads/submission-docs/${filename}`;

    const [doc] = await db.insert(documentSubmission).values({
      entityType: 'submission',
      entityId: String(submissionId),
      requestId: requestId ? parseInt(requestId, 10) : null,
      uploadedByUserId: session.user.id,
      uploadedByRole: 'consultant',
      documentLabel: label.trim(),
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
    }).returning();

    if (requestId) {
      await db.update(documentRequest).set({ status: 'completed', updatedAt: new Date() })
        .where(and(eq(documentRequest.id, parseInt(requestId, 10)), eq(documentRequest.entityType, 'submission')))
        .catch(() => {});
    }

    res.status(201).json({ ok: true, document: doc });
  } catch (err) {
    console.error('[consultant.submissions.documents.upload] ERROR:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
}
