import { db } from '../client.js';
import { sql } from 'drizzle-orm';

function isDupColumn(err: unknown): boolean {
  // FIX: was matching MySQL-only wording/codes, which Postgres never
  // produces — meant this always re-threw on restart even when the column
  // already existed and nothing was wrong (same class of bug as the other
  // migrations in this file — see candidate_cv_columns.ts / interview_rounds.ts).
  const e = err as { code?: string; cause?: { code?: string } };
  if (e?.code === '42701' || e?.cause?.code === '42701') return true;
  const msg = String(err instanceof Error ? (err.message + ' ' + (err.cause ?? '')) : err);
  return msg.includes('already exists') || msg.includes('Duplicate column') || msg.includes('ER_DUP_FIELDNAME');
}

export async function up() {
  try {
    await db.execute(sql`
      ALTER TABLE consultant_profile
      ADD COLUMN reminder_sent_at TIMESTAMP NULL DEFAULT NULL
    `);
    console.log('[migration] consultant_profile.reminder_sent_at added');
  } catch (err: unknown) {
    if (isDupColumn(err)) {
      console.log('[migration] consultant_profile.reminder_sent_at already exists — skipped');
    } else {
      throw err;
    }
  }
}
