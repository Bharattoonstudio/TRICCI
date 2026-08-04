/**
 * Migration: candidate_acknowledged_at on interview_schedule — lets the
 * candidate confirm they've seen and will attend a proposed/confirmed
 * interview, without participating in the propose/reschedule negotiation
 * itself (which stays consultant-mediated).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateInterviewCandidateAck() {
  try {
    await db.execute(sql`ALTER TABLE interview_schedule ADD COLUMN candidate_acknowledged_at TIMESTAMP`);
  } catch {
    // column already exists — safe to ignore
  }
  console.log('[migration] interview_candidate_ack: done');
}
