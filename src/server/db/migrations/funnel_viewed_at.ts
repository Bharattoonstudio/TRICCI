/**
 * Migration: viewed_at tracking on candidate_application and submission —
 * needed to populate the "Seen" stage of the employer funnel dashboard
 * (point 13: CVs Received → Seen → Rejected → Shortlisted → Interview → Selected).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateFunnelViewedAt() {
  const stmts = [
    `ALTER TABLE candidate_application ADD COLUMN viewed_at TIMESTAMP`,
    `ALTER TABLE submission ADD COLUMN viewed_at TIMESTAMP`,
  ];
  for (const stmt of stmts) {
    try {
      await db.execute(sql.raw(stmt));
    } catch {
      // column already exists — safe to ignore
    }
  }
  console.log('[migration] funnel_viewed_at: done');
}
