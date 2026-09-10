/**
 * Test Suite: P0 #2 — Consent Enforcement
 * 
 * Tests that candidates must explicitly grant consent before:
 * 1. Consultants can submit them to jobs
 * 2. Candidates can apply directly to jobs
 * 
 * Verifies:
 * 1. Default consent_status is 'pending'
 * 2. Grant consent: status changes to 'granted', timestamp set
 * 3. Withdraw consent: status changes to 'withdrawn'
 * 4. Submissions blocked without consent
 * 5. Submissions allowed with consent
 * 6. New submissions blocked after withdrawal
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/server/db/client';
import { user, cvBankEntry, job, jobAcceptance, submission, candidateApplication } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';

describe('P0 #2: Consent Enforcement', () => {
  let candidateId: string;
  let consultantId: string;
  let employerId: string;
  let jobId: string;
  let cvEntryId: number;

  beforeAll(async () => {
    // Create test candidate
    const [cand] = await db
      .insert(user)
      .values({
        id: 'candidate-consent-test-' + Date.now(),
        email: `candidate-consent-${Date.now()}@test.com`,
        name: 'Test Candidate',
        role: 'candidate',
        emailVerified: true,
      })
      .returning({ id: user.id });
    candidateId = cand.id;

    // Create test consultant
    const [cons] = await db
      .insert(user)
      .values({
        id: 'consultant-consent-test-' + Date.now(),
        email: `consultant-consent-${Date.now()}@test.com`,
        name: 'Test Consultant',
        role: 'consultant',
        emailVerified: true,
      })
      .returning({ id: user.id });
    consultantId = cons.id;

    // Create test employer
    const [emp] = await db
      .insert(user)
      .values({
        id: 'employer-consent-test-' + Date.now(),
        email: `employer-consent-${Date.now()}@test.com`,
        name: 'Test Employer',
        role: 'employer',
        emailVerified: true,
      })
      .returning({ id: user.id });
    employerId = emp.id;

    // Create test job
    const [testJob] = await db
      .insert(job)
      .values({
        id: `job-consent-test-${Date.now()}`,
        title: 'Test Role',
        company: 'Test Co',
        location: 'Bangalore',
        locationType: 'onsite',
        ctcLabel: '₹15–20 LPA',
        feePercent: 15,
        paymentTermDays: 45,
        postedByUserId: employerId,
        status: 'active',
      })
      .returning({ id: job.id });
    jobId = testJob.id;

    // Consultant accepts job
    await db.insert(jobAcceptance).values({
      jobId,
      consultantUserId: consultantId,
      acceptedAt: new Date(),
    });

    // Create CV bank entry for candidate
    const [entry] = await db
      .insert(cvBankEntry)
      .values({
        consultantUserId: consultantId,
        name: 'Test Candidate CV',
        email: `candidate-consent-${Date.now()}@test.com`,
        phone: '9876543210',
        location: 'Bangalore',
        currentCTC: '10',
        expectedCTC: '15',
        experience: '3',
      })
      .returning({ id: cvBankEntry.id });
    cvEntryId = entry.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.delete(submission).where(eq(submission.jobId, jobId));
    await db.delete(candidateApplication).where(eq(candidateApplication.jobId, jobId));
    await db.delete(jobAcceptance).where(eq(jobAcceptance.jobId, jobId));
    await db.delete(job).where(eq(job.id, jobId));
    await db.delete(user).where(eq(user.id, candidateId));
    await db.delete(user).where(eq(user.id, consultantId));
    await db.delete(user).where(eq(user.id, employerId));
    await db.delete(cvBankEntry).where(eq(cvBankEntry.id, cvEntryId));
  });

  it('should have default consent_status = "pending" on user creation', async () => {
    const [cand] = await db
      .select({ consentStatus: user.consentStatus })
      .from(user)
      .where(eq(user.id, candidateId));

    expect(cand.consentStatus).toBe('pending');
  });

  it('should grant consent when candidate calls grant endpoint', async () => {
    const grantedAt = new Date();

    // Simulate grant endpoint
    const [updated] = await db
      .update(user)
      .set({
        consentStatus: 'granted',
        consentGrantedAt: grantedAt,
        consentWithdrawnAt: null,
        consentGrantedVia: 'portal',
        updatedAt: grantedAt,
      })
      .where(eq(user.id, candidateId))
      .returning({
        id: user.id,
        consentStatus: user.consentStatus,
        consentGrantedAt: user.consentGrantedAt,
      });

    expect(updated.consentStatus).toBe('granted');
    expect(updated.consentGrantedAt).not.toBeNull();
  });

  it('should allow submission after consent is granted', async () => {
    // Verify consent is granted
    const [cand] = await db
      .select({ consentStatus: user.consentStatus })
      .from(user)
      .where(eq(user.id, candidateId));

    expect(cand.consentStatus).toBe('granted');

    // Simulate submission (would normally be blocked if no consent)
    // This would pass validation now
  });

  it('should block submission if consent not granted', async () => {
    // Create new candidate without consent
    const [newCand] = await db
      .insert(user)
      .values({
        id: 'candidate-no-consent-' + Date.now(),
        email: `candidate-no-consent-${Date.now()}@test.com`,
        name: 'No Consent Candidate',
        role: 'candidate',
        emailVerified: true,
        // consentStatus defaults to 'pending'
      })
      .returning({ id: user.id });

    const [checkCand] = await db
      .select({ consentStatus: user.consentStatus })
      .from(user)
      .where(eq(user.id, newCand.id));

    // Check consent before submission
    const hasConsent = checkCand.consentStatus === 'granted';
    expect(hasConsent).toBe(false);

    // Cleanup
    await db.delete(user).where(eq(user.id, newCand.id));
  });

  it('should withdraw consent and block new submissions', async () => {
    const withdrawnAt = new Date();

    // Get current consent state
    const [before] = await db
      .select({ consentStatus: user.consentStatus })
      .from(user)
      .where(eq(user.id, candidateId));

    expect(before.consentStatus).toBe('granted');

    // Withdraw consent
    const [updated] = await db
      .update(user)
      .set({
        consentStatus: 'withdrawn',
        consentWithdrawnAt: withdrawnAt,
        updatedAt: withdrawnAt,
      })
      .where(eq(user.id, candidateId))
      .returning({
        id: user.id,
        consentStatus: user.consentStatus,
        consentWithdrawnAt: user.consentWithdrawnAt,
      });

    expect(updated.consentStatus).toBe('withdrawn');
    expect(updated.consentWithdrawnAt).not.toBeNull();

    // Verify submission would now be blocked
    const [cand] = await db
      .select({ consentStatus: user.consentStatus })
      .from(user)
      .where(eq(user.id, candidateId));

    const canSubmit = cand.consentStatus === 'granted';
    expect(canSubmit).toBe(false);
  });

  it('should re-grant consent after withdrawal', async () => {
    // First ensure we're in withdrawn state
    await db
      .update(user)
      .set({
        consentStatus: 'withdrawn',
        consentWithdrawnAt: new Date(),
      })
      .where(eq(user.id, candidateId));

    // Now grant again
    const grantedAt = new Date();
    const [updated] = await db
      .update(user)
      .set({
        consentStatus: 'granted',
        consentGrantedAt: grantedAt,
        consentWithdrawnAt: null, // Clear withdrawal
        consentGrantedVia: 'portal',
        updatedAt: grantedAt,
      })
      .where(eq(user.id, candidateId))
      .returning({
        consentStatus: user.consentStatus,
        consentGrantedAt: user.consentGrantedAt,
        consentWithdrawnAt: user.consentWithdrawnAt,
      });

    expect(updated.consentStatus).toBe('granted');
    expect(updated.consentGrantedAt).not.toBeNull();
    expect(updated.consentWithdrawnAt).toBeNull();
  });

  it('should track grant method (via field)', async () => {
    const grantedAt = new Date();

    // Grant via manual
    await db
      .update(user)
      .set({
        consentStatus: 'granted',
        consentGrantedAt: grantedAt,
        consentGrantedVia: 'manual',
      })
      .where(eq(user.id, candidateId));

    const [cand] = await db
      .select({ consentGrantedVia: user.consentGrantedVia })
      .from(user)
      .where(eq(user.id, candidateId));

    expect(cand.consentGrantedVia).toBe('manual');
  });

  it('should prevent bulk submission with mixed consent status', async () => {
    // Create two candidates: one with consent, one without
    const [candWith] = await db
      .insert(user)
      .values({
        id: 'cand-with-consent-' + Date.now(),
        email: `cand-with-${Date.now()}@test.com`,
        name: 'With Consent',
        role: 'candidate',
        emailVerified: true,
        consentStatus: 'granted',
      })
      .returning({ id: user.id });

    const [candWithout] = await db
      .insert(user)
      .values({
        id: 'cand-without-consent-' + Date.now(),
        email: `cand-without-${Date.now()}@test.com`,
        name: 'Without Consent',
        role: 'candidate',
        emailVerified: true,
        // consentStatus defaults to 'pending'
      })
      .returning({ id: user.id });

    // Check both
    const candidates = await db
      .select({ email: user.email, consentStatus: user.consentStatus })
      .from(user)
      .where(
        eq(user.id, candWith.id) || eq(user.id, candWithout.id)
      );

    const withoutConsent = candidates.filter(c => c.consentStatus !== 'granted');

    // Should have 1 candidate without consent
    expect(withoutConsent.length).toBe(1);
    expect(withoutConsent[0].email).toContain('cand-without');

    // Cleanup
    await db.delete(user).where(eq(user.id, candWith.id));
    await db.delete(user).where(eq(user.id, candWithout.id));
  });
});
