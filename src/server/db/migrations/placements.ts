/**
 * Migration: create placement table
 * Idempotent — safe to run on every startup.
 */
import { pool } from '../pool.js';

export async function migratePlacements(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS placement (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      submission_id     INT NOT NULL,
      job_id            VARCHAR(128),
      job_title         VARCHAR(255) NOT NULL,
      company_name      VARCHAR(255) NOT NULL,
      candidate_name    VARCHAR(255) NOT NULL,
      candidate_email   VARCHAR(255) NOT NULL,
      consultant_user_id VARCHAR(36),
      consultant_name   VARCHAR(255),
      employer_user_id  VARCHAR(36),
      ctc_lpa           FLOAT,
      fee_percent       FLOAT,
      fee_amount_lpa    FLOAT,
      payment_status    VARCHAR(16) NOT NULL DEFAULT 'pending',
      placed_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_placement_submission (submission_id),
      INDEX idx_placement_consultant (consultant_user_id),
      INDEX idx_placement_employer (employer_user_id),
      INDEX idx_placement_placed_at (placed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('[migration] placements: OK');
}
