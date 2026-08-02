/**
 * Migration: add structured industries fields to consultant_profile
 * (points 23-24 — replaces the old free-text specialisation-only field
 * with proper multi-select dropdowns for industries of expertise and
 * industries the consultant wants to work in).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateConsultantIndustries() {
  const stmts = [
    `ALTER TABLE consultant_profile ADD COLUMN industries_expertise JSONB`,
    `ALTER TABLE consultant_profile ADD COLUMN industries_interested JSONB`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      // column already exists — safe to ignore
    }
  }
  console.log('[migration] consultant_industries: done');
}
