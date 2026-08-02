/**
 * Migration: add CV columns to candidate_profile
 * Adds cv_url, cv_file_name, cv_uploaded_at if they don't already exist.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateCandidateCvColumns() {
  const columns = [
    { name: 'cv_url', ddl: 'ADD COLUMN cv_url VARCHAR(512) NULL' },
    { name: 'cv_file_name', ddl: 'ADD COLUMN cv_file_name VARCHAR(255) NULL' },
    { name: 'cv_uploaded_at', ddl: 'ADD COLUMN cv_uploaded_at TIMESTAMP NULL' },
  ];

  for (const col of columns) {
    try {
      await db.execute(sql.raw(`ALTER TABLE candidate_profile ${col.ddl}`));
      console.log(`[migration] candidate_cv_columns: added ${col.name}`);
    } catch (err: unknown) {
      // FIX: this used to check MySQL's ER_DUP_FIELDNAME / errno 1060 to
      // detect "column already exists" — but Postgres uses a completely
      // different error code (42701, duplicate_column). On this Postgres
      // database, that check was never true, so this migration logged a
      // false "FAILED" error on every single server restart even when the
      // column already existed and nothing was actually wrong. Matches the
      // same class of bug already fixed elsewhere (errno 1062 vs 23505).
      const e = err as { code?: string; cause?: { code?: string } };
      const isDup = e?.code === '42701' || e?.cause?.code === '42701';
      if (isDup) {
        console.log(`[migration] candidate_cv_columns: ${col.name} already exists — skipped`);
      } else {
        console.error(`[migration] candidate_cv_columns: FAILED on ${col.name}`, err);
      }
    }
  }
}
