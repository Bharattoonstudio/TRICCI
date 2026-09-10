/**
 * Migration: adds user.welcome_sent_at so the welcome email and the admin
 * signup notification only fire once per user, even if the client calls
 * /api/auth/welcome more than once for the same account.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateWelcomeSentAt() {
  try {
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS welcome_sent_at TIMESTAMP`);
    console.log('[migration] welcome_sent_at: done');
  } catch (err) {
    console.error('[migration] welcome_sent_at: FAILED', err);
  }
}
