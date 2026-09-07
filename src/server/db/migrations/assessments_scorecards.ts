/**
 * Migration: create assessment and scorecard tables.
 * Idempotent — safe to run multiple times (uses IF NOT EXISTS).
 *
 * FIX: was written in MySQL syntax (AUTO_INCREMENT, ON UPDATE
 * CURRENT_TIMESTAMP) against a Postgres pool — could never have actually
 * run. The real tables exist via Drizzle's schema push. Rewritten with
 * valid Postgres syntax.
 */
import { db } from '../client.js';

export async function migrateAssessmentsAndScorecards() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS assessment (
        id              SERIAL PRIMARY KEY,
        submission_id   INTEGER NULL,
        candidate_name  VARCHAR(255) NOT NULL,
        candidate_email VARCHAR(255) NOT NULL,
        job_title       VARCHAR(255) NOT NULL,
        job_id          VARCHAR(128) NULL,
        posted_by_user_id VARCHAR(36) NULL,
        type            VARCHAR(128) NOT NULL DEFAULT 'Technical',
        score           INTEGER NOT NULL DEFAULT 0,
        max_score       INTEGER NOT NULL DEFAULT 100,
        status          VARCHAR(16) NOT NULL DEFAULT 'pending',
        completed_at    TIMESTAMP NULL,
        notes           TEXT NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS scorecard (
        id                  SERIAL PRIMARY KEY,
        submission_id       INTEGER NULL,
        candidate_name      VARCHAR(255) NOT NULL,
        candidate_email     VARCHAR(255) NOT NULL,
        job_title           VARCHAR(255) NOT NULL,
        job_id              VARCHAR(128) NULL,
        posted_by_user_id   VARCHAR(36) NULL,
        technical_score     INTEGER NOT NULL DEFAULT 0,
        communication_score INTEGER NOT NULL DEFAULT 0,
        culture_fit_score   INTEGER NOT NULL DEFAULT 0,
        leadership_score    INTEGER NOT NULL DEFAULT 0,
        overall_score       INTEGER NOT NULL DEFAULT 0,
        recommendation      VARCHAR(16) NOT NULL DEFAULT 'maybe',
        notes               TEXT NULL,
        submitted_by        VARCHAR(255) NULL,
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('[migration] assessments_scorecards: done');
  } catch (err) {
    console.error('[migration] assessments_scorecards: FAILED', err);
  }
}
