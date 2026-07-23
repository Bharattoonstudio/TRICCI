/**
 * Job alert matching engine.
 *
 * Given a newly posted job, finds all active subscribers whose preferences
 * match it and sends each one a personalised email notification.
 *
 * Matching rules (all are AND-ed; null/empty preference = "any"):
 *   - categories:         job.category must be in subscriber's list
 *   - locations:          job.location must contain at least one subscriber location (case-insensitive)
 *   - locationTypes:      job.locationType must be in subscriber's list
 *   - minCtc:             job.ctcMax must be >= subscriber's minCtc
 *   - minExperienceYears: job.experienceYears must be >= subscriber's minExperienceYears
 */

import { db } from '../db/client.js';
import { jobAlertSubscription } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from '../email.js';
import type { Job } from '../api/jobs/GET.js';

export async function notifyMatchingSubscribers(job: Job): Promise<void> {
  let subscribers: typeof jobAlertSubscription.$inferSelect[];

  try {
    subscribers = await db
      .select()
      .from(jobAlertSubscription)
      .where(eq(jobAlertSubscription.active, true));
  } catch (err) {
    console.error('[jobAlertMatcher] failed to fetch subscribers:', err);
    return;
  }

  const matched = subscribers.filter(sub => matchesJob(sub, job));

  if (matched.length === 0) return;

  console.log(`[jobAlertMatcher] job "${job.title}" matched ${matched.length} subscriber(s)`);

  // Send emails concurrently but cap at 10 at a time to avoid gateway overload
  const BATCH = 10;
  for (let i = 0; i < matched.length; i += BATCH) {
    const batch = matched.slice(i, i + BATCH);
    await Promise.allSettled(
      batch.map(sub =>
        sendEmail({
          to: sub.email,
          subject: `New match: ${job.title} at ${job.company} — TRICCI`,
          html: buildMatchEmail(job, sub.unsubscribeToken),
          text: buildMatchText(job, sub.unsubscribeToken),
        }).catch(err =>
          console.error(`[jobAlertMatcher] email to ${sub.email} failed:`, err),
        ),
      ),
    );
  }
}

function matchesJob(
  sub: typeof jobAlertSubscription.$inferSelect,
  job: Job,
): boolean {
  // Category filter
  if (sub.categories && sub.categories.length > 0) {
    if (!sub.categories.includes(job.category)) return false;
  }

  // Location filter (substring match — "Bengaluru" matches "Bengaluru, Karnataka")
  if (sub.locations && sub.locations.length > 0) {
    const jobLoc = job.location.toLowerCase();
    const hasMatch = sub.locations.some(l => jobLoc.includes(l.toLowerCase()));
    if (!hasMatch) return false;
  }

  // Location type filter
  if (sub.locationTypes && sub.locationTypes.length > 0) {
    if (!sub.locationTypes.includes(job.locationType)) return false;
  }

  // Minimum CTC — use ctcMax so "₹25–35 LPA" satisfies minCtc=30
  if (sub.minCtc != null && job.ctcMax < sub.minCtc) return false;

  // Minimum experience
  if (sub.minExperienceYears != null && job.experienceYears < sub.minExperienceYears) return false;

  return true;
}

function buildMatchEmail(job: Job, unsubscribeToken: string): string {
  const jobUrl = `https://tricci.in/jobs/${job.id}`;
  const unsubUrl = `https://tricci.in/unsubscribe?token=${unsubscribeToken}`;

  const skillPills = job.skills
    .slice(0, 6)
    .map(s => `<span style="display:inline-block;background:#FF6B3520;color:#FF6B35;border:1px solid #FF6B3540;border-radius:20px;padding:3px 10px;font-size:12px;margin:2px 4px 2px 0;">${s}</span>`)
    .join('');

  const locationTypeLabel: Record<string, string> = {
    onsite: 'On-site',
    hybrid: 'Hybrid',
    remote: 'Remote',
  };

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1A0A00;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1A0A00;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#2A1200;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        <!-- Header bar -->
        <tr><td style="background:linear-gradient(90deg,#FF6B35,#FFD035,#35C9FF);height:4px;"></td></tr>
        <!-- Logo -->
        <tr><td style="padding:28px 40px 0;">
          <p style="margin:0;font-size:22px;font-weight:900;color:#FF6B35;letter-spacing:3px;">TRICCI</p>
          <p style="margin:2px 0 0;font-size:11px;color:#888;letter-spacing:1px;">NEW JOB MATCH</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:20px 40px 32px;">
          <p style="margin:0 0 4px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">${job.category.toUpperCase()}</p>
          <h1 style="margin:0 0 4px;font-size:24px;font-weight:800;color:#fff;line-height:1.2;">${job.title}</h1>
          <p style="margin:0 0 20px;font-size:16px;color:#FF6B35;font-weight:600;">${job.company}</p>

          <!-- Meta pills -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="padding-right:12px;">
                <span style="display:inline-block;background:#ffffff10;color:#ccc;border-radius:6px;padding:6px 12px;font-size:13px;">📍 ${job.location}</span>
              </td>
              <td style="padding-right:12px;">
                <span style="display:inline-block;background:#ffffff10;color:#ccc;border-radius:6px;padding:6px 12px;font-size:13px;">${locationTypeLabel[job.locationType] ?? job.locationType}</span>
              </td>
              <td>
                <span style="display:inline-block;background:#FF6B3520;color:#FF6B35;border-radius:6px;padding:6px 12px;font-size:13px;font-weight:700;">${job.ctcLabel}</span>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 6px;font-size:13px;color:#888;">Experience: ${job.experience}</p>

          <!-- Description snippet -->
          <p style="margin:16px 0;color:#ccc;font-size:14px;line-height:1.7;border-left:3px solid #FF6B35;padding-left:14px;">
            ${job.description.slice(0, 220)}${job.description.length > 220 ? '…' : ''}
          </p>

          <!-- Skills -->
          <div style="margin-bottom:24px;">${skillPills}</div>

          <!-- CTA -->
          <a href="${jobUrl}" style="display:inline-block;background:#FF6B35;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:8px;margin-bottom:28px;">View Role &amp; Apply →</a>

          <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">
            You're receiving this because you set up job alerts on TRICCI.<br>
            <a href="${unsubUrl}" style="color:#FF6B35;">Unsubscribe from job alerts</a>
          </p>
        </td></tr>
        <!-- Footer bar -->
        <tr><td style="background:linear-gradient(90deg,#FF6B35,#FFD035,#35C9FF);height:2px;"></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildMatchText(job: Job, unsubscribeToken: string): string {
  return [
    `New job match on TRICCI: ${job.title} at ${job.company}`,
    '',
    `Location: ${job.location} (${job.locationType})`,
    `CTC: ${job.ctcLabel}`,
    `Experience: ${job.experience}`,
    `Category: ${job.category}`,
    '',
    job.description.slice(0, 300),
    '',
    `View & apply: https://tricci.in/jobs/${job.id}`,
    '',
    `Unsubscribe: https://tricci.in/unsubscribe?token=${unsubscribeToken}`,
  ].join('\n');
}
