/**
 * Migration: creates interview_schedule table (points 39-47 — interview
 * date proposal/confirmation flow between consultant and employer).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateInterviewSchedule() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS interview_schedule (
      id SERIAL PRIMARY KEY,
      submission_id INTEGER NOT NULL UNIQUE REFERENCES submission(id) ON DELETE CASCADE,
      status VARCHAR(24) NOT NULL DEFAULT 'proposed',
      proposed_date TIMESTAMP NOT NULL,
      proposed_by_role VARCHAR(16) NOT NULL DEFAULT 'consultant',
      proposal_note TEXT,
      interviewer_name VARCHAR(255),
      interviewer_designation VARCHAR(255),
      interviewer_contact VARCHAR(255),
      confirmed_at TIMESTAMP,
      outcome VARCHAR(16),
      outcome_reason TEXT,
      outcome_set_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_interview_submission ON interview_schedule(submission_id)`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err) {
      const msg = String((err as Error)?.message || '');
      if (!msg.includes('already exists')) {
        console.error('[migration] interview_schedule: unexpected error:', stmt, err);
      }
    }
  }
  console.log('[migration] interview_schedule: done');
}
