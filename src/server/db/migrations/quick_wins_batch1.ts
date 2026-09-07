/**
 * Migration: quick-win features batch 1
 *  - job.visibility column (public | consultant_only | confidential)
 *  - communication_log table (notes/calls/WhatsApp/email/meeting timeline)
 *  - audit_log table (append-only action history)
 */
import { db } from '../client.js';
import { sql } from 'drizzle-orm';

export async function migrateQuickWinsBatch1() {
  const statements: Array<{ name: string; sql: string }> = [
    {
      name: 'job.visibility column',
      sql: `ALTER TABLE job ADD COLUMN IF NOT EXISTS visibility VARCHAR(24) NOT NULL DEFAULT 'public'`,
    },
    {
      name: 'communication_log table',
      sql: `CREATE TABLE IF NOT EXISTS communication_log (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(24) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        type VARCHAR(16) NOT NULL DEFAULT 'note',
        message TEXT NOT NULL,
        created_by_user_id VARCHAR(36) REFERENCES user(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
    },
    {
      name: 'communication_log entity index',
      sql: `CREATE INDEX IF NOT EXISTS idx_comm_log_entity ON communication_log (entity_type, entity_id)`,
    },
    {
      name: 'audit_log table',
      sql: `CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(32) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        action VARCHAR(64) NOT NULL,
        actor_user_id VARCHAR(36) REFERENCES user(id) ON DELETE SET NULL,
        actor_role VARCHAR(16),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
    },
    {
      name: 'audit_log entity index',
      sql: `CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id)`,
    },
    {
      name: 'audit_log created_at index',
      sql: `CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at)`,
    },
  ];

  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt.sql));
      console.log(`[migration] quick_wins_batch1: ensured ${stmt.name}`);
    } catch (err) {
      console.error(`[migration] quick_wins_batch1: FAILED on ${stmt.name}`, err);
    }
  }
}
