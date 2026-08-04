/**
 * Migration: creates job_acceptance table (spec STEP 5 — consultant must
 * explicitly accept a job's terms before submitting candidates to it).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateJobAcceptance() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS job_acceptance (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(128) NOT NULL REFERENCES job(id) ON DELETE CASCADE,
        consultant_user_id VARCHAR(36) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        accepted_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_job_acceptance_job ON job_acceptance(job_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_job_acceptance_consultant ON job_acceptance(consultant_user_id)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_job_acceptance_unique ON job_acceptance(job_id, consultant_user_id)`);
    console.log('[migration] job_acceptance: done');
  } catch (err) {
    console.error('[migration] job_acceptance: FAILED', err);
  }
}
