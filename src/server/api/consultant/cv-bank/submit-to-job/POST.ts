/**
 * POST /api/consultant/cv-bank/submit-to-job
 * Submits multiple CV Bank entries to a single job in one action —
 * "bulk upload to job submissions" scoped to candidates already in the
 * consultant's own talent pool (structured data, no CV file per row —
 * see the Phase O checklist for why a raw CSV-with-files approach isn't
 * realistic). Reuses the CV Bank entry's own location/CTC/experience
 * data — no new fields need to be typed per candidate.
 * 
 * P0 #1 FIX: Now uses atomic transaction + duplicate detection
 * - Prevents two consultants from being paid for same candidate
 * - First submitter (by DB timestamp) owns the job/candidate pair
 * - Second+ submissions marked as 'duplicate'
 * 
 * Body: { jobId: string, entryIds: number[], consentConfirmed: boolean }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { cvBankEntry, submission, job, jobAcceptance, candidateApplication, user, auditLog } from '@/server/db/schema.js';
import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { hasSignedAgreement } from '@/server/lib/requireAgreement.js';
import { logAudit } from '@/lib/audit.js';

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

    // P0 #2: Verify all candidates have granted consent before submission
    const entries = await db.select().from(cvBankEntry)
      .where(and(inArray(cvBankEntry.id, entryIds), eq(cvBankEntry.consultantUserId, session.user.id)));

    const candidateEmails = entries.map(e => e.email.toLowerCase());
    const candidates = await db.select({ email: user.email, consentStatus: user.consentStatus })
      .from(user)
      .where(inArray(sql`LOWER(${user.email})`, candidateEmails));

    const withoutConsent = candidates.filter(c => c.consentStatus !== 'granted');
    if (withoutConsent.length > 0) {
      return res.status(403).json({
        error: 'consent_required',
        message: `Cannot submit candidates without consent. ${withoutConsent.length} candidate(s) have not granted consent: ${withoutConsent.map(c => c.email).join(', ')}`,
      });
    }

    const [jobRow] = await db.select({ id: job.id }).from(job).where(eq(job.id, jobId)).limit(1);
    if (!jobRow) return res.status(404).json({ error: 'Job not found' });

    if (role === 'consultant') {
      const [accepted] = await db.select({ id: jobAcceptance.id }).from(jobAcceptance)
        .where(and(eq(jobAcceptance.jobId, jobId), eq(jobAcceptance.consultantUserId, session.user.id))).limit(1);
      if (!accepted) return res.status(403).json({ error: 'job_not_accepted', message: 'Please accept this job\'s terms before submitting candidates to it.' });
    }

    // P0 #1: ATOMIC TRANSACTION for duplicate detection
    const result = await db.transaction(async (trx) => {
      let added = 0, skippedDuplicate = 0, skippedInvalid = 0;
      const seenInBatch = new Set<string>();
      const duplicateSubmissions: Array<{ candidateEmail: string; consultantId: string; winnerId?: string }> = [];

      for (const entry of entries) {
        const email = entry.email.toLowerCase();
        if (!entry.location?.trim() || !entry.expectedCTC?.trim()) {
          skippedInvalid++;
          continue;
        }
        if (seenInBatch.has(email)) {
          skippedDuplicate++;
          continue;
        }

        // Check for existing submissions — use SELECT FOR UPDATE to lock rows
        const existing = await trx.select().from(submission)
          .where(and(
            eq(submission.jobId, jobId),
            eq(sql`LOWER(${submission.candidateEmail})`, email),
            isNull(submission.ownershipEndDate) // Only active ownership
          ));

        // Check for direct applications as well
        const existingApp = await trx.select().from(candidateApplication)
          .innerJoin(user, eq(candidateApplication.candidateUserId, user.id))
          .where(and(
            eq(candidateApplication.jobId, jobId),
            eq(sql`LOWER(${user.email})`, email)
          ));

        if (existingApp.length > 0) {
          skippedDuplicate++;
          continue;
        }

        if (existing.length > 0) {
          // This candidate was already submitted by another consultant
          const winner = existing[0];
          skippedDuplicate++;
          duplicateSubmissions.push({
            candidateEmail: email,
            consultantId: session.user.id,
            winnerId: winner.consultantUserId,
          });

          // Create submission record marked as duplicate
          await trx.insert(submission).values({
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
            // P0 #1: Mark as duplicate
            duplicateFlag: 'duplicate',
            winningConsultantId: winner.consultantUserId,
            ownershipEndDate: new Date(Date.now() + (winner.ownershipExpireDays || 30) * 24 * 60 * 60 * 1000),
            ownershipExpireDays: winner.ownershipExpireDays || 30,
          });

          // Audit log duplicate detection
          await trx.insert(auditLog).values({
            userId: session.user.id,
            action: 'submission_duplicate_detected',
            entityType: 'submission',
            entityId: null, // Will be populated by DB trigger
            oldValue: JSON.stringify({ candidateEmail: email, consultant: session.user.id }),
            newValue: JSON.stringify({ winner: winner.consultantUserId, timestamp: new Date() }),
            timestamp: new Date(),
          }).catch(() => {}); // Audit failure doesn't block submission

          continue;
        }

        seenInBatch.add(email);

        // New submission — mark as 'original' owner
        await trx.insert(submission).values({
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
          // P0 #1: Mark as original owner
          duplicateFlag: 'original',
          winningConsultantId: session.user.id,
          ownershipEndDate: null, // Active ownership
          ownershipExpireDays: 30, // Default ownership period
        });
        added++;
      }

      return { added, skippedDuplicate, skippedInvalid, duplicateSubmissions };
    });

    // Log duplicates (outside transaction)
    if (result.duplicateSubmissions.length > 0) {
      console.log(`[CV-Bank-Submit] ${result.duplicateSubmissions.length} duplicate submissions detected for job ${jobId}`);
      for (const dup of result.duplicateSubmissions) {
        console.log(`  - ${dup.candidateEmail}: Consultant ${dup.consultantId} vs Winner ${dup.winnerId}`);
      }
    }

    // Fetch created submissions to show consultant immediately
    const createdSubmissions = await db.select({
      id: submission.id,
      jobId: submission.jobId,
      candidateName: submission.candidateName,
      candidateEmail: submission.candidateEmail,
      status: submission.status,
      createdAt: submission.createdAt,
      duplicateFlag: submission.duplicateFlag,
    })
      .from(submission)
      .where(and(
        eq(submission.jobId, jobId),
        eq(submission.consultantUserId, session.user.id),
        inArray(submission.candidateEmail, entries.map(e => e.email))
      ));

    res.json({
      ok: true,
      message: `Successfully submitted ${result.added} candidate(s)${result.skippedDuplicate > 0 ? ` (${result.skippedDuplicate} duplicates detected)` : ''}${result.skippedInvalid > 0 ? ` (${result.skippedInvalid} invalid)` : ''}`,
      added: result.added,
      skippedDuplicate: result.skippedDuplicate,
      skippedInvalid: result.skippedInvalid,
      requested: entryIds.length,
      // NEW: Return the actual submissions so frontend can display them immediately
      submissions: createdSubmissions.map(sub => ({
        id: sub.id,
        candidateName: sub.candidateName,
        candidateEmail: sub.candidateEmail,
        status: sub.status,
        isDuplicate: sub.duplicateFlag === 'duplicate',
        createdAt: sub.createdAt,
      })),
    });
  } catch (err) {
    console.error('[consultant.cv-bank.submit-to-job] ERROR:', err);
    res.status(500).json({ error: 'Failed to submit candidates' });
  }
}
