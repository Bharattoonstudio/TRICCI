/**
 * Job journey metrics for the admin dashboard, from existing tables.
 * posted: job.created_at · picked up: first consultant acceptance · consultants:
 * accepted vs submitting · candidates shared · interviews · selections.
 */
import { db } from '../db/client.js';
import { sql } from 'drizzle-orm';

export interface JourneyRow {
  jobId: string;
  title: string;
  company: string;
  postedAt: string | null;
  pickedUpAt: string | null;
  consultantsAccepted: number;
  consultantsSubmitting: number;
  candidatesShared: number;
  candidatesInterviewed: number;
  interviewRounds: number;
  selections: number;
  firstSelectedAt: string | null;
}

export async function getJourneys(jobId?: string): Promise<JourneyRow[]> {
  const filter = jobId ? sql`WHERE j.id = ${jobId}` : sql``;
  const result = await db.execute(sql`
    SELECT j.id, j.title, j.company, j.created_at AS posted_at,
      (SELECT MIN(a.accepted_at) FROM job_acceptance a WHERE a.job_id = j.id) AS picked_up_at,
      (SELECT COUNT(DISTINCT a.consultant_user_id) FROM job_acceptance a WHERE a.job_id = j.id) AS consultants_accepted,
      (SELECT COUNT(DISTINCT s.consultant_user_id) FROM submission s WHERE s.job_id = j.id) AS consultants_submitting,
      (SELECT COUNT(*) FROM submission s WHERE s.job_id = j.id) AS candidates_shared,
      (SELECT COUNT(DISTINCT r.submission_id) FROM interview_rounds r JOIN submission s ON s.id = r.submission_id WHERE s.job_id = j.id) AS candidates_interviewed,
      (SELECT COUNT(*) FROM interview_rounds r JOIN submission s ON s.id = r.submission_id WHERE s.job_id = j.id) AS interview_rounds,
      (SELECT COUNT(*) FROM placement p WHERE p.job_id = j.id) AS selections,
      (SELECT MIN(p.placed_at) FROM placement p WHERE p.job_id = j.id) AS first_selected_at
    FROM job j
    ${filter}
    ORDER BY j.created_at DESC NULLS LAST
    LIMIT 100
  `);
  const rows = ((result as unknown as { rows?: unknown[] }).rows ?? (result as unknown as unknown[])) as Record<string, unknown>[];
  const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
  const num = (v: unknown) => Number(v ?? 0);
  return rows.map(r => ({
    jobId: String(r.id),
    title: String(r.title),
    company: String(r.company),
    postedAt: iso(r.posted_at),
    pickedUpAt: iso(r.picked_up_at),
    consultantsAccepted: num(r.consultants_accepted),
    consultantsSubmitting: num(r.consultants_submitting),
    candidatesShared: num(r.candidates_shared),
    candidatesInterviewed: num(r.candidates_interviewed),
    interviewRounds: num(r.interview_rounds),
    selections: num(r.selections),
    firstSelectedAt: iso(r.first_selected_at),
  }));
}
