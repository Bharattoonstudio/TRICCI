/**
 * Migration: admin_visibility
 * - Adds posted_by_user_id column to job table
 * - Creates submission table for consultant candidate submissions
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateAdminVisibility(): Promise<void> {
  // Add posted_by_user_id to job table
  try {
    await db.execute(sql`
      ALTER TABLE job
      ADD COLUMN posted_by_user_id VARCHAR(36) NULL REFERENCES user(id) ON DELETE SET NULL
    `);
    console.log('[migration] Added posted_by_user_id to job table');
  } catch {
    // Column already exists — safe to ignore
  }

  // Create submission table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS submission (
        id INT PRIMARY KEY AUTO_INCREMENT,
        job_id VARCHAR(128) NOT NULL,
        consultant_user_id VARCHAR(36) NOT NULL,
        candidate_user_id VARCHAR(36) NULL,
        candidate_name VARCHAR(255) NOT NULL,
        candidate_email VARCHAR(255) NOT NULL,
        candidate_phone VARCHAR(32) NULL,
        cv_url VARCHAR(512) NULL,
        cover_note TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES job(id) ON DELETE CASCADE,
        FOREIGN KEY (consultant_user_id) REFERENCES user(id) ON DELETE CASCADE,
        FOREIGN KEY (candidate_user_id) REFERENCES user(id) ON DELETE SET NULL
      )
    `);
    console.log('[migration] Created submission table');
  } catch {
    // Table already exists — safe to ignore
  }
}
