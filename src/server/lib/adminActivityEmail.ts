/**
 * Emails every admin when portal activity happens:
 *  - a consultant accepts a job
 *  - a consultant shares a candidate (single or CV Bank bulk)
 *  - a candidate applies to a job
 * Best effort: never throws, never blocks the request that triggered it.
 */
import { db } from '../db/client.js';
import { user } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from '../email.js';

const ORANGE = '#E8470A';
const PURPLE = '#6B4FBB';

function esc(v: unknown): string {
  return String(v ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type ActivityRow = [label: string, value: string];

function buildHtml(title: string, headline: string, rows: ActivityRow[]): string {
  const rowHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;font-size:12px;color:#888888;width:38%;vertical-align:top;">${esc(k)}</td>` +
        `<td style="padding:8px 0;font-size:14px;color:#f0f0f0;vertical-align:top;">${esc(v)}</td></tr>`,
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:48px 16px 64px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
        <tr><td style="height:3px;background:linear-gradient(90deg,${ORANGE} 0%,${PURPLE} 100%);border-radius:3px 3px 0 0;"></td></tr>
        <tr><td style="background:#111111;border-radius:0 0 20px 20px;border:1px solid #ffffff0d;border-top:none;padding:36px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:${ORANGE};text-transform:uppercase;">${esc(title)}</p>
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#f0f0f0;line-height:1.25;">${esc(headline)}</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ffffff0d;">${rowHtml}</table>
          <p style="margin:28px 0 0;font-size:13px;color:#888888;">— <strong style="color:${ORANGE};">TRICCI</strong></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Sends one email per admin. Never throws. */
export async function notifyAdminsActivity(title: string, headline: string, rows: ActivityRow[]): Promise<void> {
  try {
    const admins = await db.select({ email: user.email }).from(user).where(eq(user.role, 'admin'));
    if (admins.length === 0) return;
    const subject = `${headline}`;
    const html = buildHtml(title, headline, rows);
    const text = `${headline}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n— TRICCI`;
    await Promise.allSettled(admins.map(a => sendEmail({ to: a.email, subject, html, text })));
  } catch (err) {
    console.error('[admin.activity.email] failed:', err);
  }
}
