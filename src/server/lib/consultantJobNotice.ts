/**
 * In-app notification to every consultant when an employer posts a job.
 * Always states the payout terms: payouts are made only after day 90, and the
 * invoice must be submitted by day 90.
 */
import { db } from '../db/client.js';
import { user, notification } from '../db/schema.js';
import { and, eq, isNull } from 'drizzle-orm';

export const PAYOUT_NOTE =
  'Payouts are made only after day 90 from the candidate\'s joining date. Submit your invoice by day 90 to be paid on day 92.';

export async function notifyConsultantsOfNewJob(jobId: string, title: string, company: string): Promise<void> {
  const consultants = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.role, 'consultant'), isNull(user.suspendedAt)));

  if (consultants.length === 0) return;

  const message = `New job posted: ${title} at ${company}. ${PAYOUT_NOTE}`;
  const link = `/consultant/jobs/${jobId}`;
  const BATCH = 500;
  for (let i = 0; i < consultants.length; i += BATCH) {
    await db.insert(notification).values(
      consultants.slice(i, i + BATCH).map(c => ({
        userId: c.id,
        type: 'job_posted',
        message,
        link,
      })),
    );
  }
  console.log(`[consultantJobNotice] notified ${consultants.length} consultant(s) of job ${jobId}`);
}
