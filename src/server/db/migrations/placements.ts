/**
 * Migration: create placement table
 * Idempotent — safe to run on every startup.
 *
 * FIX: this was written entirely in MySQL syntax (AUTO_INCREMENT, inline
 * INDEX, ENGINE=InnoDB) against a Postgres pool — it could never have
 * actually created this table. The real `placement` table in production
 * exists because Drizzle's schema (schema.ts) created it separately. This
 * migration was dead code that threw an error on every single server
 * startup. Rewritten with valid Postgres syntax so it's now a correct,
 * harmless no-op once the table exists.
 */
import { pool } from '../pool.js';

export async function migratePlacements(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS placement (
        id                SERIAL PRIMARY KEY,
        submission_id     INTEGER NOT NULL,
        job_id            VARCHAR(128),
        job_title         VARCHAR(255) NOT NULL,
        company_name      VARCHAR(255) NOT NULL,
        candidate_name    VARCHAR(255) NOT NULL,
        candidate_email   VARCHAR(255) NOT NULL,
        consultant_user_id VARCHAR(36),
        consultant_name   VARCHAR(255),
        employer_user_id  VARCHAR(36),
        ctc_lpa           DOUBLE PRECISION,
        fee_percent       DOUBLE PRECISION,
        fee_amount_lpa    DOUBLE PRECISION,
        payment_status    VARCHAR(16) NOT NULL DEFAULT 'pending',
        placed_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_placement_submission ON placement(submission_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_placement_consultant ON placement(consultant_user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_placement_employer ON placement(employer_user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_placement_placed_at ON placement(placed_at)`);
    console.log('[migration] placements: OK');
  } catch (err) {
    console.error('[migration] placements: FAILED', err);
  }
}
