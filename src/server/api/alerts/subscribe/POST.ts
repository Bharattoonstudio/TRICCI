/**
 * POST /api/alerts/subscribe
 *
 * Creates or updates a job alert subscription for a candidate.
 *
 * Body:
 *   email           string   required
 *   categories      string[] optional  e.g. ["technology","product"]
 *   locations       string[] optional  e.g. ["Bengaluru","Mumbai"]
 *   locationTypes   string[] optional  e.g. ["remote","hybrid"]
 *   minCtc          number   optional  minimum CTC in LPA
 *   minExperienceYears number optional
 *   userId          string   optional  link to authenticated user
 */

import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { jobAlertSubscription } from '../../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { sendEmail } from '../../../email.js';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: Request, res: Response) {
  const {
    email,
    categories,
    locations,
    locationTypes,
    minCtc,
    minExperienceYears,
    userId,
  } = req.body ?? {};

  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check for an existing active subscription for this email
    const existing = await db
      .select()
      .from(jobAlertSubscription)
      .where(
        and(
          eq(jobAlertSubscription.email, normalizedEmail),
          eq(jobAlertSubscription.active, true),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update preferences on the existing subscription
      await db
        .update(jobAlertSubscription)
        .set({
          categories: Array.isArray(categories) ? categories : null,
          locations: Array.isArray(locations) ? locations : null,
          locationTypes: Array.isArray(locationTypes) ? locationTypes : null,
          minCtc: typeof minCtc === 'number' ? minCtc : null,
          minExperienceYears: typeof minExperienceYears === 'number' ? minExperienceYears : null,
          ...(userId ? { userId: String(userId) } : {}),
        })
        .where(eq(jobAlertSubscription.id, existing[0].id));

      return res.json({ success: true, updated: true, message: 'Your job alert preferences have been updated.' });
    }

    // Create a new subscription
    const id = randomUUID();
    const unsubscribeToken = randomUUID().replace(/-/g, '');

    await db.insert(jobAlertSubscription).values({
      id,
      email: normalizedEmail,
      userId: userId ? String(userId) : null,
      categories: Array.isArray(categories) ? categories : null,
      locations: Array.isArray(locations) ? locations : null,
      locationTypes: Array.isArray(locationTypes) ? locationTypes : null,
      minCtc: typeof minCtc === 'number' ? minCtc : null,
      minExperienceYears: typeof minExperienceYears === 'number' ? minExperienceYears : null,
      unsubscribeToken,
      active: true,
    });

    // Send a confirmation email (fire-and-forget — don't block the response)
    sendEmail({
      to: normalizedEmail,
      subject: 'Job alerts activated — TRICCI',
      html: buildConfirmationEmail(normalizedEmail, unsubscribeToken, { categories, locations, locationTypes, minCtc }),
      text: `You're subscribed to TRICCI job alerts. We'll email you when new roles match your preferences.\n\nUnsubscribe: https://tricci.in/unsubscribe?token=${unsubscribeToken}`,
    }).catch(err => console.error('[alerts/subscribe] confirmation email failed:', err));

    return res.status(201).json({ success: true, updated: false, message: 'Job alerts activated! You\'ll hear from us when matching roles are posted.' });
  } catch (err) {
    console.error('[POST /api/alerts/subscribe]', err);
    return res.status(500).json({ error: 'Failed to save subscription. Please try again.' });
  }
}

function buildConfirmationEmail(
  email: string,
  unsubscribeToken: string,
  prefs: { categories?: string[]; locations?: string[]; locationTypes?: string[]; minCtc?: number },
): string {
  const prefLines: string[] = [];
  if (prefs.categories?.length) prefLines.push(`<li><strong>Categories:</strong> ${prefs.categories.join(', ')}</li>`);
  if (prefs.locations?.length) prefLines.push(`<li><strong>Locations:</strong> ${prefs.locations.join(', ')}</li>`);
  if (prefs.locationTypes?.length) prefLines.push(`<li><strong>Work type:</strong> ${prefs.locationTypes.join(', ')}</li>`);
  if (prefs.minCtc) prefLines.push(`<li><strong>Minimum CTC:</strong> ₹${prefs.minCtc} LPA</li>`);

  const prefsHtml = prefLines.length
    ? `<p style="margin:16px 0 8px;color:#ccc;font-size:14px;">Your current preferences:</p><ul style="margin:0 0 20px;padding-left:20px;color:#ccc;font-size:14px;">${prefLines.join('')}</ul>`
    : `<p style="margin:16px 0 20px;color:#ccc;font-size:14px;">You'll receive alerts for all new senior roles on TRICCI.</p>`;

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
        <tr><td style="padding:32px 40px 0;">
          <p style="margin:0;font-size:24px;font-weight:900;color:#FF6B35;letter-spacing:3px;">TRICCI</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888;letter-spacing:1px;">INDIA'S RECRUITMENT MARKETPLACE</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:28px 40px 32px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#fff;">Job alerts activated ✓</h1>
          <p style="margin:0 0 16px;color:#ccc;font-size:15px;line-height:1.6;">
            You're now subscribed to job match alerts at <strong style="color:#FF6B35;">${email}</strong>.
            We'll notify you as soon as a new role matches your preferences.
          </p>
          ${prefsHtml}
          <a href="https://tricci.in/jobs" style="display:inline-block;background:#FF6B35;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;margin-bottom:24px;">Browse current openings →</a>
          <p style="margin:0;color:#555;font-size:12px;line-height:1.6;">
            Don't want these emails?
            <a href="https://tricci.in/unsubscribe?token=${unsubscribeToken}" style="color:#FF6B35;">Unsubscribe in one click</a>.
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
