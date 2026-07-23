/**
 * Migration: indexes
 * Adds performance indexes on high-traffic filter/join columns.
 * Idempotent — each ALTER TABLE is wrapped in a try/catch so duplicate
 * index errors are silently ignored.
 */
import { db } from '../client.js';

async function addIndex(sql: string, label: string) {
  try {
    await db.execute(sql as unknown as Parameters<typeof db.execute>[0]);
    console.log(`[migration] indexes: added ${label}`);
  } catch {
    // Index already exists — safe to ignore
  }
}

export async function migrateIndexes() {
  // ── submission ────────────────────────────────────────────────────────────
  await addIndex(
    `ALTER TABLE submission ADD INDEX idx_sub_consultant (consultant_user_id)`,
    'submission.consultant_user_id',
  );
  await addIndex(
    `ALTER TABLE submission ADD INDEX idx_sub_job (job_id)`,
    'submission.job_id',
  );
  await addIndex(
    `ALTER TABLE submission ADD INDEX idx_sub_status (status)`,
    'submission.status',
  );
  await addIndex(
    `ALTER TABLE submission ADD INDEX idx_sub_candidate (candidate_user_id)`,
    'submission.candidate_user_id',
  );
  await addIndex(
    `ALTER TABLE submission ADD INDEX idx_sub_created (created_at)`,
    'submission.created_at',
  );

  // ── job ───────────────────────────────────────────────────────────────────
  await addIndex(
    `ALTER TABLE job ADD INDEX idx_job_posted_by (posted_by_user_id)`,
    'job.posted_by_user_id',
  );
  await addIndex(
    `ALTER TABLE job ADD INDEX idx_job_status (status)`,
    'job.status',
  );
  await addIndex(
    `ALTER TABLE job ADD INDEX idx_job_category (category)`,
    'job.category',
  );
  await addIndex(
    `ALTER TABLE job ADD INDEX idx_job_created (created_at)`,
    'job.created_at',
  );

  // ── candidate_application ─────────────────────────────────────────────────
  await addIndex(
    `ALTER TABLE candidate_application ADD INDEX idx_ca_status (status)`,
    'candidate_application.status',
  );
  await addIndex(
    `ALTER TABLE candidate_application ADD INDEX idx_ca_created (created_at)`,
    'candidate_application.created_at',
  );

  // ── assessment ────────────────────────────────────────────────────────────
  await addIndex(
    `ALTER TABLE assessment ADD INDEX idx_assess_posted_by (posted_by_user_id)`,
    'assessment.posted_by_user_id',
  );
  await addIndex(
    `ALTER TABLE assessment ADD INDEX idx_assess_submission (submission_id)`,
    'assessment.submission_id',
  );
  await addIndex(
    `ALTER TABLE assessment ADD INDEX idx_assess_status (status)`,
    'assessment.status',
  );

  // ── scorecard ─────────────────────────────────────────────────────────────
  await addIndex(
    `ALTER TABLE scorecard ADD INDEX idx_sc_posted_by (posted_by_user_id)`,
    'scorecard.posted_by_user_id',
  );
  await addIndex(
    `ALTER TABLE scorecard ADD INDEX idx_sc_submission (submission_id)`,
    'scorecard.submission_id',
  );

  // ── user ──────────────────────────────────────────────────────────────────
  await addIndex(
    `ALTER TABLE user ADD INDEX idx_user_role (role)`,
    'user.role',
  );

  console.log('[migration] indexes: done');
}
