/**
 * Migration: placement.submission_id becomes nullable, and a new
 * application_id column is added — a placement (and therefore an offer)
 * can now be created from either a consultant submission or a direct
 * candidate application. Direct hires still carry the full platform fee;
 * there's just no consultant to split it with.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migratePlacementDirectApplicationSupport() {
  try {
    await db.execute(sql`ALTER TABLE placement ALTER COLUMN submission_id DROP NOT NULL`);
    await db.execute(sql`ALTER TABLE placement ADD COLUMN IF NOT EXISTS application_id INTEGER REFERENCES candidate_application(id) ON DELETE CASCADE`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_placement_application ON placement(application_id)`);
    console.log('[migration] placement_direct_application_support: done');
  } catch (err) {
    console.error('[migration] placement_direct_application_support: FAILED', err);
  }
}
