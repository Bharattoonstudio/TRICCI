import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { candidateProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { readExistingCvText } from '@/lib/cv-text.js';

/**
 * GET /api/candidate/cv-preview
 * Returns a plain-text preview of the current candidate's own uploaded CV,
 * extracted server-side (PDF via pdf.js, DOCX via mammoth). Used by CVViewer
 * to show an inline preview for file types the browser can't render directly.
 */
export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const userId = session.user.id;

    const [profile] = await db.select().from(candidateProfile)
      .where(eq(candidateProfile.userId, userId));

    if (!profile?.cvUrl) {
      return res.status(404).json({ error: 'No CV uploaded' });
    }

    const text = await readExistingCvText(profile.cvUrl);
    if (!text) {
      return res.status(200).json({ text: null, reason: 'preview_unavailable' });
    }

    res.json({ text });
  } catch (err) {
    console.error('candidate.cv-preview.get.error', err);
    res.status(500).json({ error: 'Failed to load CV preview' });
  }
}
