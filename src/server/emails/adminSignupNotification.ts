/**
 * Admin signup notification — sent to connect@tricci.in every time a new
 * user completes signup. Contains the full user list with signup dates,
 * per explicit request. Note: this grows with the user base — if it ever
 * becomes unwieldy, this is the file to trim down to a recent-N or
 * count-only version.
 */
import { db } from '@/server/db/client.js';
import { user } from '@/server/db/schema.js';
import { desc } from 'drizzle-orm';
import { sendEmail } from '@/server/email.js';

const ADMIN_EMAIL = 'connect@tricci.in';
const ORANGE = '#E8470A';
const PURPLE = '#6B4FBB';
const BG = '#080808';
const CARD = '#111111';
const TEXT = '#f0f0f0';
const MUTED = '#888888';

export async function sendAdminSignupNotification(newUser: { name: string; email: string; role: string }) {
  const allUsers = await db
    .select({ name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
    .from(user)
    .orderBy(desc(user.createdAt));

  const totalUsers = allUsers.length;

  const rows = allUsers.map(u => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #ffffff0d;color:${TEXT};font-size:13px;">${u.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ffffff0d;color:${MUTED};font-size:13px;">${u.email}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ffffff0d;color:${MUTED};font-size:12px;text-transform:capitalize;">${u.role}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #ffffff0d;color:${MUTED};font-size:12px;">${u.createdAt ? new Date(u.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
    </tr>
  `).join('');

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New Signup: ${newUser.name} — Total Users: ${totalUsers}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>New Signup</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:720px;" cellpadding="0" cellspacing="0">
        <tr><td style="height:3px;background:linear-gradient(90deg,${ORANGE} 0%,${PURPLE} 100%);border-radius:3px 3px 0 0;"></td></tr>
        <tr><td style="background:${CARD};border-radius:0 0 16px 16px;border:1px solid #ffffff0d;border-top:none;padding:28px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:2px;color:${ORANGE};text-transform:uppercase;">New Signup</p>
          <h1 style="margin:0 0 4px;font-size:20px;font-weight:900;color:${TEXT};">${newUser.name}</h1>
          <p style="margin:0 0 20px;font-size:13px;color:${MUTED};">${newUser.email} · <span style="text-transform:capitalize;">${newUser.role}</span></p>
          <div style="background:#181818;border:1px solid #ffffff0f;border-radius:12px;padding:16px 20px;margin-bottom:24px;display:inline-block;">
            <p style="margin:0;font-size:12px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;">Total Users</p>
            <p style="margin:2px 0 0;font-size:28px;font-weight:900;color:${TEXT};">${totalUsers}</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <thead>
              <tr>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #ffffff1a;">Name</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #ffffff1a;">Email</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #ffffff1a;">Role</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:${MUTED};text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #ffffff1a;">Signed Up</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
