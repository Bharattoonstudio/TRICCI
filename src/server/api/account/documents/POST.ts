/**
 * POST /api/account/documents
 * Uploads a new document to the current user's account (GST cert,
 * incorporation doc, agency registration, etc.). Accepts multipart/form-data
 * with a "label" field and a "file".
 */
import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { db } from '@/server/db/client.js';
import { accountDocument } from '@/server/db/schema.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

const DOC_DIR = '/shared-storage/public/assets/account-docs';

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
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'consultant' && role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { label } = req.body as { label?: string };
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!label?.trim()) return res.status(400).json({ error: 'A document label is required' });
    if (!file) return res.status(400).json({ error: 'A file is required' });

    await fs.mkdir(DOC_DIR, { recursive: true });
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${session.user.id}-${safeName}`;
    await fs.writeFile(path.join(DOC_DIR, filename), file.buffer);
    const fileUrl = `/airo-assets/uploads/account-docs/${filename}`;

    const [doc] = await db.insert(accountDocument).values({
      userId: session.user.id,
      role: role === 'admin' ? 'employer' : role,
      label: label.trim(),
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
    }).returning();

    res.status(201).json({ ok: true, document: doc });
  } catch (err) {
    console.error('[account.documents.post] ERROR:', err);
    res.status(500).json({ error: 'Failed to upload document' });
  }
}
