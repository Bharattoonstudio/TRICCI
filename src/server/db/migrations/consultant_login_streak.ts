/**
 * Migration: login streak tracking for gamification. Points, badges, and
 * leaderboard rank are all computed live from existing submission/
 * placement data (no duplicate storage to keep in sync) — this is the
 * one thing that genuinely can't be derived from anything else.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateConsultantLoginStreak() {
  const stmts = [
    `ALTER TABLE consultant_profile ADD COLUMN login_streak INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE consultant_profile ADD COLUMN last_login_date VARCHAR(10)`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      // column already exists — safe to ignore
    }
  }
  console.log('[migration] consultant_login_streak: done');
}
