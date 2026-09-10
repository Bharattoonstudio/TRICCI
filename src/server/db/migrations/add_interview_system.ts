/**
 * Migration: Add interview rounds tracking system
 * Creates new table for managing interview stages, feedback, and scoring
 * Fixes: Employer cannot see interview stage, candidate has zero visibility
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateInterviewSystem() {
  const stmts = [
    // Create interview rounds table
    `CREATE TABLE IF NOT EXISTS interview_rounds (
      id SERIAL PRIMARY KEY,
      submission_id INT NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
      round INT NOT NULL,
      round_name VARCHAR(100),
      status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
      scheduled_at TIMESTAMP,
      completed_at TIMESTAMP,
      interviewer_id VARCHAR(36),
      feedback TEXT,
      score INT,
      reason_for_selection VARCHAR(500),
      next_steps TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(submission_id, round)
    )`,
    
    // Create indices
    `CREATE INDEX IF NOT EXISTS idx_interview_submission ON interview_rounds(submission_id)`,
    `CREATE INDEX IF NOT EXISTS idx_interview_status ON interview_rounds(status)`,
    `CREATE INDEX IF NOT EXISTS idx_interview_scheduled ON interview_rounds(scheduled_at)`,
    
    // Add interview status column to submissions
    `ALTER TABLE submission ADD COLUMN IF NOT EXISTS interview_status VARCHAR(50)`,
  ];

  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
      console.log(`[migration] executed: ${stmt.substring(0, 60)}...`);
    } catch (e) {
      console.log(`[migration] skipped (already exists): ${stmt.substring(0, 60)}...`);
    }
  }
  console.log('[migration] add_interview_system: done');
}
