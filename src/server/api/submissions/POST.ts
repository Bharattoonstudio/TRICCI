/**
 * POST /api/submissions
 * Consultant submits a candidate for a job.
 * Accepts multipart/form-data with fields + optional cv (file).
 * CV is stored at /shared-storage/public/assets/cvs/<id>-<filename>
 * and served at /airo-assets/uploads/cvs/<id>-<filename>.
 */
import type { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { db } from '@/server/db/client.js';
import { submission, job } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { hasSignedAgreement } from '@/server/lib/requireAgreement.js';

const CV_DIR = '/shared-storage/public/assets/cvs';

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
    // Auth — consultant only
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') {
      return res.status(403).json({ error: 'Only consultants may submit candidates' });
    }
    if (role === 'consultant' && !(await hasSignedAgreement(session.user.id, 'consultant'))) {
      return res.status(403).json({ error: 'agreement_required', message: 'Please accept the TRICCI agreement before submitting candidates' });
    }

    const { jobId, candidateName, candidateEmail, candidatePhone, notes } =
      req.body as Record<string, string>;

    if (!jobId || !candidateName || !candidateEmail) {
      return res.status(400).json({ error: 'jobId, candidateName, and candidateEmail are required' });
    }

    // Verify job exists
    const [jobRow] = await db.select({ id: job.id }).from(job).where(eq(job.id, jobId)).limit(1);
    if (!jobRow) return res.status(404).json({ error: 'Job not found' });

    // Save CV file if provided
    let cvUrl: string | null = null;
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (file) {
      await fs.mkdir(CV_DIR, { recursive: true });
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${Date.now()}-${safeName}`;
      await fs.writeFile(path.join(CV_DIR, filename), file.buffer);
      cvUrl = `/airo-assets/uploads/cvs/${filename}`;
    }

    // Insert submission row
    const [result] = await db.insert(submission).values({
      jobId,
      consultantUserId: session.user.id,
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim().toLowerCase(),
      candidatePhone: candidatePhone?.trim() || null,
      cvUrl,
      coverNote: notes?.trim() || null,
      status: 'pending',
    }).returning();

    const insertId = result?.id ?? 0;

    res.status(201).json({
      ok: true,
      submissionId: insertId,
      cvUrl,
      message: 'Candidate submitted successfully',
    });
  } catch (err) {
    console.error('submissions.post.error', err);
    res.status(500).json({ error: 'Failed to submit candidate' });
  }
}
