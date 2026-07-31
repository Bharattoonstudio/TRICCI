/**
 * Migration: add agreement / T&C columns to employer_profile and
 * candidate_profile (consultant_profile already has these from an
 * earlier migration). Cross-cutting rule: ALL three roles must accept
 * an agreement before they can act on the platform.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateAgreementAllRoles() {
  const cols = [
    `ALTER TABLE employer_profile ADD COLUMN signatory_name VARCHAR(255)`,
    `ALTER TABLE employer_profile ADD COLUMN designation VARCHAR(255)`,
    `ALTER TABLE employer_profile ADD COLUMN agreement_signed_at TIMESTAMP NULL`,
    `ALTER TABLE employer_profile ADD COLUMN agreement_ip VARCHAR(64)`,
    `ALTER TABLE employer_profile ADD COLUMN agreement_hash VARCHAR(128)`,
    `ALTER TABLE candidate_profile ADD COLUMN signatory_name VARCHAR(255)`,
    `ALTER TABLE candidate_profile ADD COLUMN agreement_signed_at TIMESTAMP NULL`,
    `ALTER TABLE candidate_profile ADD COLUMN agreement_ip VARCHAR(64)`,
    `ALTER TABLE candidate_profile ADD COLUMN agreement_hash VARCHAR(128)`,
  ];
  for (const stmt of cols) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      // column already exists — safe to ignore
    }
  }
  console.log('[migration] agreement_all_roles: done');
}
