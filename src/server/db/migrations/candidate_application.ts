/**
 * Migration: create candidate_application table
 * Stores direct applications made by candidates from the job detail page.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateCandidateApplication() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS candidate_application (
        id INT PRIMARY KEY AUTO_INCREMENT,
        job_id VARCHAR(128) NOT NULL,
        candidate_user_id VARCHAR(36) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'applied',
        cover_note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_candidate_app_job (job_id),
        INDEX idx_candidate_app_user (candidate_user_id),
        UNIQUE KEY uq_candidate_job (job_id, candidate_user_id)
      )
    `);
    console.log('[migration] candidate_application: OK');
  } catch (err) {
    console.error('[migration] candidate_application: FAILED', err);
  }
}
