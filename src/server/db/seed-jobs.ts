/**
 * Seed script — populates the `job` table from the canonical mock data.
 * Run with: npx tsx src/server/db/seed-jobs.ts
 * Safe to re-run: uses INSERT IGNORE so existing rows are skipped.
 */
import { db } from './client.js';
import { JOBS_DATA } from '../api/jobs/GET.js';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log(`Seeding ${JOBS_DATA.length} jobs…`);

  for (const j of JOBS_DATA) {
    await db.execute(sql`
      INSERT IGNORE INTO job (
        id, title, company, department, location, location_type,
        ctc_min, ctc_max, ctc_label, experience, experience_years,
        category, skills, description, responsibilities, requirements,
        posted_days, status, applicants, fee_percent
      ) VALUES (
        ${j.id}, ${j.title}, ${j.company}, ${j.department}, ${j.location}, ${j.locationType},
        ${j.ctcMin}, ${j.ctcMax}, ${j.ctcLabel}, ${j.experience}, ${j.experienceYears},
        ${j.category}, ${JSON.stringify(j.skills)}, ${j.description},
        ${JSON.stringify(j.responsibilities)}, ${JSON.stringify(j.requirements)},
        ${j.postedDays}, ${j.status}, ${j.applicants}, ${j.feePercent}
      )
    `);
  }

  console.log('Done.');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
