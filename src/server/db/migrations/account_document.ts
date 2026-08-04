/**
 * Migration: creates account_document table — generic document
 * upload/management for employer and consultant accounts (GST
 * certificates, incorporation docs, etc.), separate from the platform
 * agreement which has its own dedicated flow.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateAccountDocument() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS account_document (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        role VARCHAR(16) NOT NULL,
        label VARCHAR(255) NOT NULL,
        file_url VARCHAR(512) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_account_document_user ON account_document(user_id)`);
    console.log('[migration] account_document: done');
  } catch (err) {
    console.error('[migration] account_document: FAILED', err);
  }
}
