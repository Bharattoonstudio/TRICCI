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
      // Drizzle wraps MySQL errors — check both the top-level code and the cause
      const e = err as { code?: string; errno?: number; cause?: { code?: string; errno?: number } };
      const isDup =
        e?.code === 'ER_DUP_FIELDNAME' ||
        e?.errno === 1060 ||
        e?.cause?.code === 'ER_DUP_FIELDNAME' ||
        e?.cause?.errno === 1060;
      if (isDup) {
        console.log(`[migration] candidate_cv_columns: ${col.name} already exists — skipped`);
      } else {
        console.error(`[migration] candidate_cv_columns: FAILED on ${col.name}`, err);
      }
    }
  }
}
