import { sql } from 'drizzle-orm';

/**
 * Migration: Add Candidate Consent Tracking
 * 
 * P0 #2 Fix: Enforces candidate consent before submission to any job
 * 
 * New fields added to user table (for candidates only):
 * - consent_status: 'pending' | 'granted' | 'withdrawn'
 * - consent_granted_at: When candidate granted consent
 * - consent_withdrawn_at: When candidate revoked consent
 * - consent_granted_via: 'email' | 'portal' | 'manual' (how consent obtained)
 * 
 * Consent required before:
 * - Consultant can submit candidate to any job
 * - Candidate can apply directly to any job
 */

export const up = async (db: any) => {
  // Add columns to user table
  await db.execute(sql`
    ALTER TABLE "user"
    ADD COLUMN consent_status VARCHAR(32) DEFAULT 'pending',
    ADD COLUMN consent_granted_at TIMESTAMP,
    ADD COLUMN consent_withdrawn_at TIMESTAMP,
    ADD COLUMN consent_granted_via VARCHAR(32) DEFAULT 'portal';
  `);

  // Index for finding candidates needing consent
  await db.execute(sql`
    CREATE INDEX idx_user_consent_status
    ON "user"(consent_status)
    WHERE role = 'candidate';
  `);

  // Index for consent lifecycle queries
  await db.execute(sql`
    CREATE INDEX idx_user_consent_timeline
    ON "user"(consent_granted_at, consent_withdrawn_at);
  `);
};

export const down = async (db: any) => {
  // Drop indexes
  await db.execute(sql`DROP INDEX IF EXISTS idx_user_consent_timeline`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_user_consent_status`);

  // Drop columns
  await db.execute(sql`
    ALTER TABLE "user"
    DROP COLUMN IF EXISTS consent_status,
    DROP COLUMN IF EXISTS consent_granted_at,
    DROP COLUMN IF EXISTS consent_withdrawn_at,
    DROP COLUMN IF EXISTS consent_granted_via;
  `);
};
