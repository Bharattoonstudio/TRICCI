/**
 * Cleanup: Remove jobs with dangling postedByUserId references
 *
 * Background: Some jobs may have postedByUserId pointing to deleted users.
 * This migration cleans up those orphaned records.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function cleanupOrphanedJobs() {
  try {
    const result = await db.execute(sql`
      DELETE FROM jobs
      WHERE "postedByUserId" IS NOT NULL
        AND "postedByUserId" NOT IN (SELECT id FROM users)
    `);
    
    console.log('[migration] cleanup_orphaned_jobs: completed');
  } catch (err) {
    console.error('[migration] cleanup_orphaned_jobs failed:', err);
  }
}
