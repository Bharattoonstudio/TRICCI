/**
 * Migration: candidate detail + consent fields on submission — the
 * frontend Submit Candidate form was already sending CTC/experience but
 * the backend silently discarded them (no columns existed). Also adds
 * location (now mandatory) and consent confirmation/proof (spec STEP 7,
 * points 33-34).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateSubmissionCandidateDetails() {
  const stmts = [
    `ALTER TABLE submission ADD COLUMN candidate_current_ctc_lpa DOUBLE PRECISION`,
    `ALTER TABLE submission ADD COLUMN candidate_expected_ctc_lpa DOUBLE PRECISION`,
    `ALTER TABLE submission ADD COLUMN candidate_experience_years DOUBLE PRECISION`,
    `ALTER TABLE submission ADD COLUMN candidate_location VARCHAR(255)`,
    `ALTER TABLE submission ADD COLUMN consent_confirmed BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE submission ADD COLUMN consent_proof_url VARCHAR(512)`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      // column already exists — safe to ignore
    }
  }
  console.log('[migration] submission_candidate_details: done');
}
