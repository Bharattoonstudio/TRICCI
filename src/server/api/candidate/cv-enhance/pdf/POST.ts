/**
 * POST /api/candidate/cv-enhance/pdf
 * Body: { jobId: string, cv: EnhancedCvContent }
 *
 * Called once the candidate has reviewed and approved an AI-enhanced CV
 * (from POST /api/candidate/cv-enhance). Renders it to a PDF and saves it
 * under the same CV storage directory used for regular uploads — WITHOUT
 * touching the candidate's master profile CV. Returns a downloadable URL
 * that the frontend can also pass to /api/jobs/:id/apply so this exact
 * tailored CV is the one submitted for that specific application.
 */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { renderCvPdf, type EnhancedCvContent } from '@/lib/pdf-cv.js';

interface Body {
  jobId?: string;
  cv?: EnhancedCvContent;
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const role = (session.user as { role?: string }).role;
    if (role !== 'candidate') return res.status(403).json({ error: 'Candidate access required' });

    const { jobId, cv } = req.body as Body;
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });
    if (!cv || !cv.name || !cv.summary) return res.status(400).json({ error: 'Invalid CV content' });

    // Basic size guard — cap number of bullets/skills so a bad payload can't
    // produce a runaway PDF.
    const safeCv: EnhancedCvContent = {
      ...cv,
      skills: (cv.skills ?? []).slice(0, 40),
      experience: (cv.experience ?? []).slice(0, 15).map(e => ({
        ...e,
        bullets: (e.bullets ?? []).slice(0, 12),
      })),
      education: (cv.education ?? []).slice(0, 10),
    };

    const pdfBuffer = await renderCvPdf(safeCv);

    const filename = `${session.user.id}-${jobId}-enhanced-${randomUUID()}.pdf`;
    const dir = '/shared-storage/public/assets/uploads/cvs';
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), pdfBuffer);

    const cvUrl = `/airo-assets/uploads/cvs/${filename}`;
    const cvFileName = `${(cv.name || 'Candidate').replace(/[^a-zA-Z0-9 _-]/g, '')} - Enhanced CV.pdf`;

    res.json({ cvUrl, cvFileName });
  } catch (err) {
    console.error('[cv-enhance/pdf] error', err);
    res.status(500).json({ error: 'Could not generate CV PDF' });
  }
}
