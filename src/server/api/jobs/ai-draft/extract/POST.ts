/**
 * POST /api/jobs/ai-draft/extract
 * Employer-only. Reads an uploaded JD (PDF, Word or text) and returns its text,
 * so the employer can ask AI to enhance it. Nothing is saved.
 *
 * multipart/form-data with a `jd` file (max 5 MB).
 * Response: { text } or { text: null, reason }
 */
import type { Request, Response } from 'express';
import multer from 'multer';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { extractJdText } from '@/server/lib/jd-ai.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
export const multerMiddleware = upload.single('jd');

const ALLOWED = ['pdf', 'docx', 'txt'];

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const role = (session.user as { role?: string }).role;
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Only employers can upload job descriptions' });
    }

    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) return res.status(400).json({ error: 'Please choose a PDF, Word or text file' });

    const ext = file.originalname.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED.includes(ext)) {
      return res.status(400).json({ error: 'Only PDF, DOCX or TXT files are supported' });
    }

    const text = await extractJdText(file.buffer, file.mimetype, file.originalname);
    if (!text) {
      return res.status(200).json({ text: null, reason: 'no_text' });
    }
    return res.status(200).json({ text: text.slice(0, 20000) });
  } catch (error) {
    console.error('[jobs/ai-draft/extract] error', error instanceof Error ? error.message : error);
    return res.status(200).json({ text: null, reason: 'extract_failed' });
  }
}
