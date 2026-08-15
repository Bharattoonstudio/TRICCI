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
import { submission, job, jobAcceptance, candidateApplication, user } from '@/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
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
      'image/png', 'image/jpeg', 'image/webp',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, or image files are accepted.'));
  },
});

export const multerMiddleware = upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'proof', maxCount: 1 }]);

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

    const { jobId, candidateName, candidateEmail, candidatePhone, notes, currentCTC, expectedCTC, experience, location, consentConfirmed } =
      req.body as Record<string, string>;

    if (!jobId || !candidateName || !candidateEmail) {
      return res.status(400).json({ error: 'jobId, candidateName, and candidateEmail are required' });
    }
    if (!location?.trim()) {
      return res.status(400).json({ error: 'Candidate location is required' });
    }
    if (!expectedCTC || Number(expectedCTC) <= 0) {
      return res.status(400).json({ error: 'Candidate expected CTC is required' });
    }
    if (consentConfirmed !== 'true') {
      return res.status(400).json({ error: 'You must confirm the candidate has consented to this submission' });
    }

    // Verify job exists
    const [jobRow] = await db.select({ id: job.id }).from(job).where(eq(job.id, jobId)).limit(1);
    if (!jobRow) return res.status(404).json({ error: 'Job not found' });

    // Spec STEP 5: consultant must have explicitly accepted this job's
    // terms before submitting a candidate to it.
    if (role === 'consultant') {
      const [accepted] = await db
        .select({ id: jobAcceptance.id })
        .from(jobAcceptance)
        .where(and(eq(jobAcceptance.jobId, jobId), eq(jobAcceptance.consultantUserId, session.user.id)))
        .limit(1);
      if (!accepted) {
        return res.status(403).json({ error: 'job_not_accepted', message: 'Please accept this job\'s terms before submitting a candidate.' });
      }
    }

    // Duplicate candidate detection (spec STEP 7): block re-submitting the
    // same candidate (by email) to the same job — whether by this
    // consultant or a different one. Prevents double-submission and
    // resume-farming disputes between consultants working the same role.
    const normalizedEmail = candidateEmail.trim().toLowerCase();
    const [existing] = await db
      .select({ id: submission.id, status: submission.status, consultantUserId: submission.consultantUserId })
      .from(submission)
      .where(and(eq(submission.jobId, jobId), eq(submission.candidateEmail, normalizedEmail)))
      .limit(1);

    if (existing) {
      const isOwnSubmission = existing.consultantUserId === session.user.id;
      return res.status(409).json({
        error: 'duplicate_candidate',
        message: isOwnSubmission
          ? `You've already submitted this candidate for this job (status: ${existing.status}).`
          : `This candidate has already been submitted for this job by another consultant (status: ${existing.status}). Duplicate submissions aren't allowed.`,
        status: existing.status,
      });
    }

    // Cross-check against direct candidate applications: the check above
    // only catches consultant-vs-consultant duplicates within the
    // `submission` table. This catches the case where the SAME candidate
    // already applied directly (self-applied) to this same job — matched
    // by email (case-insensitive) via the account that owns the
    // application. Without this, a candidate who applies for free could
    // also be "found" and submitted by a consultant afterward, creating
    // ambiguity over who — if anyone — is owed a placement fee.
    const [existingDirectApp] = await db
      .select({ id: candidateApplication.id, status: candidateApplication.status })
      .from(candidateApplication)
      .innerJoin(user, eq(candidateApplication.candidateUserId, user.id))
      .where(and(
        eq(candidateApplication.jobId, jobId),
        sql`lower(${user.email}) = ${normalizedEmail}`,
      ))
      .limit(1);

    if (existingDirectApp) {
      return res.status(409).json({
        error: 'duplicate_candidate',
        message: `This candidate has already applied directly for this job (status: ${existingDirectApp.status}). Duplicate submissions aren't allowed.`,
        status: existingDirectApp.status,
      });
    }

    // Save CV + optional proof files if provided
    let cvUrl: string | null = null;
    let proofUrl: string | null = null;
    const files = (req as Request & { files?: Record<string, Express.Multer.File[]> }).files;
    const cvFile = files?.cv?.[0];
    const proofFile = files?.proof?.[0];

    if (cvFile) {
      await fs.mkdir(CV_DIR, { recursive: true });
      const safeName = cvFile.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${Date.now()}-${safeName}`;
      await fs.writeFile(path.join(CV_DIR, filename), cvFile.buffer);
      cvUrl = `/airo-assets/uploads/cvs/${filename}`;
    }
    if (proofFile) {
      await fs.mkdir(CV_DIR, { recursive: true });
      const safeName = proofFile.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = `${Date.now()}-proof-${safeName}`;
      await fs.writeFile(path.join(CV_DIR, filename), proofFile.buffer);
      proofUrl = `/airo-assets/uploads/cvs/${filename}`;
    }

    // Insert submission row
    const [result] = await db.insert(submission).values({
      jobId,
      consultantUserId: session.user.id,
      candidateName: candidateName.trim(),
      candidateEmail: normalizedEmail,
      candidatePhone: candidatePhone?.trim() || null,
      cvUrl,
      coverNote: notes?.trim() || null,
      status: 'pending',
      candidateCurrentCtcLpa: currentCTC ? Number(currentCTC) : null,
      candidateExpectedCtcLpa: Number(expectedCTC),
      candidateExperienceYears: experience ? Number(experience) : null,
      candidateLocation: location.trim(),
      consentConfirmed: true,
      consentProofUrl: proofUrl,
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
