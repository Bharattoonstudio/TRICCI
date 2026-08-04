/**
 * POST /api/consultant/cv-bank/submit-to-job
 * Submits multiple CV Bank entries to a single job in one action —
 * "bulk upload to job submissions" scoped to candidates already in the
 * consultant's own talent pool (structured data, no CV file per row —
 * see the Phase O checklist for why a raw CSV-with-files approach isn't
 * realistic). Reuses the CV Bank entry's own location/CTC/experience
 * data — no new fields need to be typed per candidate.
 * Body: { jobId: string, entryIds: number[], consentConfirmed: boolean }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { cvBankEntry, submission, job, jobAcceptance } from '@/server/db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { hasSignedAgreement } from '@/server/lib/requireAgreement.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const { jobId, entryIds, consentConfirmed } = req.body as { jobId?: string; entryIds?: number[]; consentConfirmed?: boolean };
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });
    if (!Array.isArray(entryIds) || entryIds.length === 0) return res.status(400).json({ error: 'Select at least one candidate' });
    if (entryIds.length > 100) return res.status(400).json({ error: 'Maximum 100 candidates per bulk submission' });
    if (!consentConfirmed) return res.status(400).json({ error: 'You must confirm the selected candidates have consented to this submission' });

    if (role === 'consultant' && !(await hasSignedAgreement(session.user.id, 'consultant'))) {
      return res.status(403).json({ error: 'agreement_required', message: 'Please accept the TRICCI agreement first' });
    }

    const [jobRow] = await db.select({ id: job.id }).from(job).where(eq(job.id, jobId)).limit(1);
    if (!jobRow) return res.status(404).json({ error: 'Job not found' });

    if (role === 'consultant') {
      const [accepted] = await db.select({ id: jobAcceptance.id }).from(jobAcceptance)
        .where(and(eq(jobAcceptance.jobId, jobId), eq(jobAcceptance.consultantUserId, session.user.id))).limit(1);
      if (!accepted) return res.status(403).json({ error: 'job_not_accepted', message: 'Please accept this job\'s terms before submitting candidates to it.' });
    }

    const entries = await db.select().from(cvBankEntry)
      .where(and(inArray(cvBankEntry.id, entryIds), eq(cvBankEntry.consultantUserId, session.user.id)));

    const existingSubs = await db.select({ candidateEmail: submission.candidateEmail }).from(submission).where(eq(submission.jobId, jobId));
    const existingEmails = new Set(existingSubs.map(s => s.candidateEmail.toLowerCase()));

    let added = 0, skippedDuplicate = 0, skippedInvalid = 0;
    const seenInBatch = new Set<string>();

    for (const entry of entries) {
      const email = entry.email.toLowerCase();
      if (!entry.location?.trim() || !entry.expectedCTC?.trim()) { skippedInvalid++; continue; }
      if (existingEmails.has(email) || seenInBatch.has(email)) { skippedDuplicate++; continue; }
      seenInBatch.add(email);

      await db.insert(submission).values({
        jobId,
        consultantUserId: session.user.id,
        candidateName: entry.name,
        candidateEmail: email,
        candidatePhone: entry.phone,
        cvUrl: null,
        status: 'pending',
        candidateCurrentCtcLpa: entry.currentCTC ? Number(entry.currentCTC) || null : null,
        candidateExpectedCtcLpa: Number(entry.expectedCTC) || null,
        candidateExperienceYears: entry.experience ? Number(entry.experience) || null : null,
        candidateLocation: entry.location,
        consentConfirmed: true,
        consentProofUrl: null,
      });
      added++;
    }

    res.json({ ok: true, added, skippedDuplicate, skippedInvalid, requested: entryIds.length });
  } catch (err) {
    console.error('[consultant.cv-bank.submit-to-job] ERROR:', err);
    res.status(500).json({ error: 'Failed to submit candidates' });
  }
}
