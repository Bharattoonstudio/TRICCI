/**
 * Migration: Add offer withdrawal support to placement table
 * Allows employers to withdraw/recall offers before candidate accepts
 * Fixes issue: Accidental offers cannot be undone
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateOfferWithdrawn() {
  const stmts = [
    // Add withdrawal timestamp
    `ALTER TABLE placement ADD COLUMN offer_withdrawn_at TIMESTAMP`,
    // Add who withdrew it (employer user ID)
    `ALTER TABLE placement ADD COLUMN offer_withdrawn_by VARCHAR(36)`,
    // Add index for querying withdrawn offers
    `CREATE INDEX idx_placement_withdrawn ON placement(offer_withdrawn_at)`,
  ];

  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
      console.log(`[migration] executed: ${stmt.substring(0, 50)}...`);
    } catch (e) {
      // Column or index may already exist — safe to ignore
      console.log(`[migration] skipped (already exists): ${stmt.substring(0, 50)}...`);
    }
  }
  console.log('[migration] add_offer_withdrawn: done');
}
