import { db } from '../client.js';
import { sql } from 'drizzle-orm';

function isDupColumn(err: unknown): boolean {
  const msg = String(err instanceof Error ? (err.message + ' ' + (err.cause ?? '')) : err);
  return msg.includes('Duplicate column') || msg.includes('ER_DUP_FIELDNAME');
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
