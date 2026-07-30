/**
 * Migration: add per-application CV columns to candidate_application.
 * These are populated only when a candidate approves an AI-enhanced,
 * JD-tailored CV for a specific job application (via the CV Enhancer).
 * When null, readers fall back to the candidate's profile CV.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateCandidateApplicationCvColumns() {
  const columns = [
    { name: 'cv_url', ddl: 'ADD COLUMN IF NOT EXISTS cv_url VARCHAR(512) NULL' },
    { name: 'cv_file_name', ddl: 'ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255) NULL' },
    { name: 'cv_match_score', ddl: 'ADD COLUMN IF NOT EXISTS cv_match_score INTEGER NULL' },
  ];

  for (const col of columns) {
    try {
      await db.execute(sql.raw(`ALTER TABLE candidate_application ${col.ddl}`));
      console.log(`[migration] candidate_application_cv_columns: ensured ${col.name}`);
    } catch (err) {
      console.error(`[migration] candidate_application_cv_columns: FAILED on ${col.name}`, err);
    }
  }
}
