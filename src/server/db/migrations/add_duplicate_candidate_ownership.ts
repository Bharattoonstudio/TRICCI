import { sql } from 'drizzle-orm';
import type { MigrationMeta } from 'drizzle-orm/migrator';

/**
 * Migration: Add Duplicate Candidate Ownership Fields
 * 
 * P0 #1 Fix: Prevents two consultants from being paid for the same candidate
 * 
 * New fields added to submission table:
 * - duplicate_flag: 'original' | 'duplicate' | NULL
 * - winning_consultant_id: ID of winning consultant (first submitter)
 * - ownership_end_date: When duplicate ownership expires
 * - ownership_expire_days: Configured days until auto-clear
 * 
 * Unique index ensures only one 'original' submission per (job, email, consultant)
 */

export const up = async (db: any) => {
  // Add columns to submission table
  await db.execute(sql`
    ALTER TABLE submission
    ADD COLUMN duplicate_flag VARCHAR(32),
    ADD COLUMN winning_consultant_id VARCHAR(36),
    ADD COLUMN ownership_end_date TIMESTAMP,
    ADD COLUMN ownership_expire_days INTEGER DEFAULT 30;
  `);

  // Create partial unique index to enforce single winner per (job, email) pair
  // NULL ownership_end_date means it's currently active
  await db.execute(sql`
    CREATE UNIQUE INDEX idx_submission_duplicate_ownership
    ON submission(job_id, candidate_email, consultant_user_id)
    WHERE duplicate_flag IS NULL OR duplicate_flag = 'original';
  `);

  // Index for finding duplicate submissions
  await db.execute(sql`
    CREATE INDEX idx_submission_duplicate_flag
    ON submission(duplicate_flag, job_id);
  `);

  // Index for expiry cleanup
  await db.execute(sql`
    CREATE INDEX idx_submission_ownership_expiry
    ON submission(ownership_end_date)
    WHERE ownership_end_date IS NOT NULL;
  `);
};

export const down = async (db: any) => {
  // Drop indexes
  await db.execute(sql`DROP INDEX IF EXISTS idx_submission_ownership_expiry`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_submission_duplicate_flag`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_submission_duplicate_ownership`);

  // Drop columns
  await db.execute(sql`
    ALTER TABLE submission
    DROP COLUMN IF EXISTS duplicate_flag,
    DROP COLUMN IF EXISTS winning_consultant_id,
    DROP COLUMN IF EXISTS ownership_end_date,
    DROP COLUMN IF EXISTS ownership_expire_days;
  `);
};
