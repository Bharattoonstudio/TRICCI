/**
 * Migration: rejection reason fields (point 8) + contact unlock request
 * table (points 11-12) — closes the bug where shortlisting a direct
 * application auto-unlocked the candidate's real contact details with no
 * admin/payment gate at all.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateRejectionAndUnlock() {
  const stmts = [
    `ALTER TABLE submission ADD COLUMN rejection_reason TEXT`,
    `ALTER TABLE candidate_application ADD COLUMN rejection_reason TEXT`,
    `CREATE TABLE IF NOT EXISTS contact_unlock_request (
      id SERIAL PRIMARY KEY,
      application_id INTEGER NOT NULL REFERENCES candidate_application(id) ON DELETE CASCADE,
      employer_user_id VARCHAR(36) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      candidate_user_id VARCHAR(36) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      request_note TEXT,
      resolved_by_user_id VARCHAR(36),
      resolved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_unlock_req_application ON contact_unlock_request(application_id)`,
    `CREATE INDEX IF NOT EXISTS idx_unlock_req_status ON contact_unlock_request(status)`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err) {
      // column/table already exists — safe to ignore, but log anything else
      const msg = String((err as Error)?.message || '');
      if (!msg.includes('already exists') && !msg.includes('duplicate column')) {
        console.error('[migration] rejection_and_unlock: unexpected error on statement:', stmt, err);
      }
    }
  }
  console.log('[migration] rejection_and_unlock: done');
}
