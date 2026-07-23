/**
 * Migration: add interview_rounds JSON column to job table
 * Safe to run multiple times — uses try/catch per ALTER.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

function isDupColumn(err: unknown): boolean {
  const msg = String(err instanceof Error ? (err.message + ' ' + (err.cause ?? '')) : err);
  return msg.includes('Duplicate column') || msg.includes('ER_DUP_FIELDNAME');
}

export async function migrateInterviewRounds() {
  try {
    await db.execute(sql`
      ALTER TABLE job ADD COLUMN interview_rounds JSON NULL
    `);
    console.log('[migration] interview_rounds column added to job table');
  } catch (err: unknown) {
    if (isDupColumn(err)) {
      console.log('[migration] interview_rounds column already exists — skipped');
    } else {
      console.error('[migration] interview_rounds migration error:', err);
    }
  }
}
