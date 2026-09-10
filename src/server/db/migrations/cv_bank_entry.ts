/**
 * Migration: creates cv_bank_entry table — consultant's personal talent
 * pool / CRM (previously entirely fake, local-only React state that lost
 * everything on page refresh).
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateCvBankEntry() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS cv_bank_entry (
        id SERIAL PRIMARY KEY,
        consultant_user_id VARCHAR(36) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(32),
        current_role VARCHAR(255),
        current_ctc VARCHAR(64),
        expected_ctc VARCHAR(64),
        experience VARCHAR(64),
        location VARCHAR(255),
        skills JSONB DEFAULT '[]',
        tags JSONB DEFAULT '[]',
        notes TEXT,
        starred BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_cv_bank_consultant ON cv_bank_entry(consultant_user_id)`);
    console.log('[migration] cv_bank_entry: done');
  } catch (err) {
    console.error('[migration] cv_bank_entry: FAILED', err);
  }
}
