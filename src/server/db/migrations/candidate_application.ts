/**
 * Migration: create candidate_application table
 * Stores direct applications made by candidates from the job detail page.
 *
 * FIX: was written in MySQL syntax (AUTO_INCREMENT, inline INDEX, UNIQUE
 * KEY) against a Postgres pool — could never have actually run. The real
 * table exists via Drizzle's schema push. Rewritten with valid Postgres
 * syntax. Also deliberately does NOT recreate the old UNIQUE KEY on
 * (job_id, candidate_user_id) — that constraint was already removed from
 * the application logic in favor of the 90-day reapply window (see
 * src/server/api/jobs/[id]/apply/POST.ts), so a hard DB-level uniqueness
 * constraint would incorrectly block legitimate reapplications.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateCandidateApplication() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS candidate_application (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(128) NOT NULL,
        candidate_user_id VARCHAR(36) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'applied',
        cover_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_candidate_app_job ON candidate_application(job_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_candidate_app_user ON candidate_application(candidate_user_id)`);
    console.log('[migration] candidate_application: OK');
  } catch (err) {
    console.error('[migration] candidate_application: FAILED', err);
  }
}
