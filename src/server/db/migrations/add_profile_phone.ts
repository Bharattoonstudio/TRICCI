/**
 * Migration: adds phone to employer_profile and consultant_profile so every
 * role can store its mobile number (candidate_profile already has one).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateProfilePhone() {
  try {
    await db.execute(sql`ALTER TABLE employer_profile ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    await db.execute(sql`ALTER TABLE consultant_profile ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`);
    console.log('[migration] profile_phone: done');
  } catch (err) {
    console.error('[migration] profile_phone: FAILED', err);
  }
}
