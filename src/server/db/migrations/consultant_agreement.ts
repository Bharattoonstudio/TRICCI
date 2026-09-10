/**
 * Migration: add agreement / KYC columns to consultant_profile
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateConsultantAgreement() {
  const cols = [
    `ALTER TABLE consultant_profile ADD COLUMN agency_name VARCHAR(255)`,
    `ALTER TABLE consultant_profile ADD COLUMN signatory_name VARCHAR(255)`,
    `ALTER TABLE consultant_profile ADD COLUMN designation VARCHAR(255)`,
    `ALTER TABLE consultant_profile ADD COLUMN agreement_signed_at TIMESTAMP NULL`,
    `ALTER TABLE consultant_profile ADD COLUMN agreement_ip VARCHAR(64)`,
    `ALTER TABLE consultant_profile ADD COLUMN agreement_hash VARCHAR(128)`,
  ];
  for (const stmt of cols) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      // column already exists — safe to ignore
    }
  }
  console.log('[migration] consultant_agreement: done');
}
