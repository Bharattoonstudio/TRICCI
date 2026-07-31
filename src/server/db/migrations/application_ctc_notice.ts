/**
 * Migration: add CTC breakdown + notice period columns to candidate_application
 * (point 61-62 of the SOP: 4-way CTC split + negotiable/non-negotiable toggle,
 * captured per-application since expectations can differ per job).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateApplicationCtcNotice() {
  const cols = [
    `ALTER TABLE candidate_application ADD COLUMN ctc_fixed INTEGER`,
    `ALTER TABLE candidate_application ADD COLUMN ctc_variable INTEGER`,
    `ALTER TABLE candidate_application ADD COLUMN ctc_esops INTEGER`,
    `ALTER TABLE candidate_application ADD COLUMN ctc_other INTEGER`,
    `ALTER TABLE candidate_application ADD COLUMN notice_period_days INTEGER`,
    `ALTER TABLE candidate_application ADD COLUMN notice_period_negotiable BOOLEAN DEFAULT true`,
  ];
  for (const stmt of cols) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      // column already exists — safe to ignore
    }
  }
  console.log('[migration] application_ctc_notice: done');
}
