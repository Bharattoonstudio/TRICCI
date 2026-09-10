// Migration: Add admin panel system (audit logs, user columns)
// Created: September 10, 2026

import { sql } from "drizzle-orm";
import { db } from "../client.js";

export async function migrateAdminPanelSystem() {
  console.log("[migration] admin_panel_system: starting...");

  try {
    // Check if audit_log table already exists
    const tableExists = await db.execute(
      sql`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log'
      )`
    );

    if (!tableExists[0]?.exists) {
      console.log("[migration] admin_panel_system: creating audit_log table...");
      
      // Create audit_log table
      await db.execute(
        sql`
          CREATE TABLE audit_log (
            id TEXT PRIMARY KEY,
            admin_id TEXT NOT NULL REFERENCES users(id),
            action VARCHAR(100) NOT NULL,
            target_id TEXT,
            target_type VARCHAR(50),
            details JSONB,
            ip VARCHAR(45),
            user_agent TEXT,
            timestamp TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
          )
        `
      );

      // Create indexes
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC)`
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id ON audit_log(admin_id)`
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)`
      );
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log(target_id, target_type)`
      );

      console.log("[migration] admin_panel_system: audit_log table created with indexes");
    } else {
      console.log("[migration] admin_panel_system: audit_log table already exists");
    }

    // Add columns to users table
    const checkColumns = await db.execute(
      sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name IN (
          'suspended_at', 'suspend_reason', 'deleted_at', 
          'deleted_by', 'activity_score', 'last_login_at'
        )
      `
    );

    const existingColumns = checkColumns.map((row) => row.column_name);

    // Add missing columns
    if (!existingColumns.includes("suspended_at")) {
      console.log("[migration] admin_panel_system: adding suspended_at column...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN suspended_at TIMESTAMP`);
    }

    if (!existingColumns.includes("suspend_reason")) {
      console.log("[migration] admin_panel_system: adding suspend_reason column...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN suspend_reason TEXT`);
    }

    if (!existingColumns.includes("deleted_at")) {
      console.log("[migration] admin_panel_system: adding deleted_at column...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP`);
    }

    if (!existingColumns.includes("deleted_by")) {
      console.log("[migration] admin_panel_system: adding deleted_by column...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN deleted_by TEXT`);
    }

    if (!existingColumns.includes("activity_score")) {
      console.log("[migration] admin_panel_system: adding activity_score column...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN activity_score NUMERIC DEFAULT 0`);
    }

    if (!existingColumns.includes("last_login_at")) {
      console.log("[migration] admin_panel_system: adding last_login_at column...");
      await db.execute(sql`ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP`);
    }

    // Create indexes on users table
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_users_suspended_at ON users(suspended_at)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at)`
    );
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`
    );

    console.log("[migration] admin_panel_system: completed successfully ✅");
  } catch (error) {
    console.error("[migration] admin_panel_system: error -", error);
    throw error;
  }
}
