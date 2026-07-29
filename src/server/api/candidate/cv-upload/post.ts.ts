/**
 * POST /api/candidate/cv-upload
 * Accepts multipart/form-data with a `cv` file field.
 * Saves to /shared-storage/public/assets/uploads/cvs/ and returns the URL.
 */
import type { Request, Response } from 'express';
import multer from 'multer';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { db } from '@/server/db/client.js';
import { candidateProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Bug fix: this route previously had no multer middleware registered in
// entry.ts, so `req.file` was always undefined and every upload failed
// with "No file uploaded". Exporting `multerMiddleware` here follows the
// same convention as /api/submissions/POST.ts.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, DOC, or DOCX files are accepted.'));
  },
});

export const multerMiddleware = upload.single('cv');

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    // multer attaches file to req.file
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? 'pdf';
    const filename = `${session.user.id}-${randomUUID()}.${ext}`;
    const dir = '/shared-storage/public/assets/uploads/cvs';
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), file.buffer);

    const cvUrl = `/airo-assets/uploads/cvs/${filename}`;
    const cvFileName = file.originalname;
    const cvUploadedAt = new Date();

    await db.update(candidateProfile)
      .set({ cvUrl, cvFileName, cvUploadedAt })
      .where(eq(candidateProfile.userId, session.user.id));

    res.json({ cvUrl, cvFileName, cvUploadedAt });
  } catch (err) {
    console.error('candidate.cv-upload.error', err);
    res.status(500).json({ error: 'Upload failed' });
  }
}
