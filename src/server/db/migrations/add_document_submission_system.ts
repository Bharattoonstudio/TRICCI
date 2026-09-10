/**
 * Migration: creates document_request and document_submission tables —
 * lets an employer ask for documents (PAN, payslips, relieving letter,
 * etc.) once a candidate is shortlisted/selected, and lets a consultant
 * or the candidate upload them. Works for both consultant submissions
 * and direct candidate applications via entityType/entityId, the same
 * polymorphic convention already used by communication_log/audit_log.
 * Visibility is derived from uploaded_by_role at query time: consultant-
 * uploaded docs are visible to {consultant, employer}; candidate-uploaded
 * docs are visible to {candidate, employer} — never both at once.
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateDocumentSubmissionSystem() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS document_request (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(24) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        requested_by_user_id VARCHAR(36) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        document_labels JSONB NOT NULL DEFAULT '[]',
        message TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_doc_request_entity ON document_request(entity_type, entity_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS document_submission (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(24) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        request_id INTEGER REFERENCES document_request(id) ON DELETE SET NULL,
        uploaded_by_user_id VARCHAR(36) NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        uploaded_by_role VARCHAR(16) NOT NULL,
        document_label VARCHAR(255) NOT NULL,
        file_url VARCHAR(512) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER,
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_doc_submission_entity ON document_submission(entity_type, entity_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_doc_submission_uploader ON document_submission(uploaded_by_user_id)`);

    console.log('[migration] document_submission_system: done');
  } catch (err) {
    console.error('[migration] document_submission_system: FAILED', err);
  }
}
