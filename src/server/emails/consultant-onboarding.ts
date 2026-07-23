/**
 * Consultant onboarding email sequence — 3 emails:
 *
 * 1. welcome()          — sent immediately on signup (role = consultant)
 * 2. agreementReminder() — sent when consultant logs in without having signed yet
 * 3. agreementConfirmed() — sent immediately after agreement is signed
 * 4. jobsReady()         — sent 30 s after agreement is signed (nudge to browse)
 */

import { sendEmail } from '@/server/email.js';

// ─── Shared brand styles ──────────────────────────────────────────────────────
const BG = '#0d0d0d';
const CARD = '#161616';
const ORANGE = '#E8470A';
const PURPLE = '#6B4FBB';
const TEXT = '#e5e5e5';
const MUTED = '#888';
const BASE_URL = 'https://tricci.in';

function wrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TRICCI</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:${CARD};border-radius:16px;overflow:hidden;border:1px solid #ffffff0d;">
          <!-- Header bar -->
          <tr>
            <td style="background:linear-gradient(135deg,${ORANGE} 0%,${PURPLE} 100%);padding:4px 0;"></td>
          </tr>
          <!-- Logo row -->
          <tr>
            <td style="padding:28px 32px 0;">
              <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">TRI<span style="color:${ORANGE};">CCI</span></span>
            </td>
          </tr>
          <!-- Body -->
          ${body}
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #ffffff08;">
              <p style="margin:0;font-size:11px;color:#444;line-height:1.6;">
                You&rsquo;re receiving this because you signed up as a consultant on TRICCI.<br/>
                &copy; ${new Date().getFullYear()} TRICCI &mdash; India&rsquo;s Recruitment Marketplace &bull;
                <a href="${BASE_URL}" style="color:#555;text-decoration:none;">tricci.in</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(label: string, href: string, color = ORANGE): string {
  return `<a href="${href}" style="display:inline-block;background:${color};color:#fff;font-weight:700;font-size:14px;padding:13px 28px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">${label}</a>`;
}

function stepRow(num: string, title: string, desc: string, color: string): string {
  return `
  <tr>
    <td style="padding:0 32px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="40" valign="top">
            <div style="width:32px;height:32px;border-radius:8px;background:${color}20;border:1px solid ${color}40;text-align:center;line-height:32px;font-size:13px;font-weight:900;color:${color};">${num}</div>
          </td>
          <td style="padding-left:12px;">
            <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:${TEXT};">${title}</p>
            <p style="margin:0;font-size:13px;color:${MUTED};">${desc}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─── 1. Welcome email ─────────────────────────────────────────────────────────
export async function sendConsultantWelcomeEmail(to: string, name: string): Promise<void> {
  const firstName = name.split(' ')[0];
  const html = wrapper(`
    <tr>
      <td style="padding:28px 32px 8px;">
        <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#fff;line-height:1.2;">
          Welcome to TRICCI, ${firstName}! 🎉
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:${MUTED};line-height:1.6;">
          You&rsquo;re now part of India&rsquo;s fastest-growing recruitment marketplace.
          Here&rsquo;s how to get started and earn your first placement fee.
        </p>
      </td>
    </tr>
    ${stepRow('1', 'Sign the Platform Agreement', 'Takes 2 minutes. Unlocks access to all live mandates.', ORANGE)}
    ${stepRow('2', 'Browse Live Mandates', 'Accept jobs that match your candidate pool.', PURPLE)}
    ${stepRow('3', 'Submit Candidates', 'Upload CVs directly from your dashboard.', '#22c55e')}
    ${stepRow('4', 'Earn Your Fee', 'Get paid when your candidate joins. 0% upfront cost.', '#ffd035')}
    <tr>
      <td style="padding:8px 32px 32px;">
        ${btn('Go to My Dashboard', `${BASE_URL}/consultant/dashboard`)}
        <p style="margin:16px 0 0;font-size:12px;color:#555;">
          Questions? Reply to this email or visit our
          <a href="${BASE_URL}/consultant" style="color:${ORANGE};text-decoration:none;">Consultant Guide</a>.
        </p>
      </td>
    </tr>
  `);

  await sendEmail({
    to,
    subject: `Welcome to TRICCI, ${firstName} — your first mandate awaits`,
    html,
    text: `Hi ${firstName},\n\nWelcome to TRICCI! Here's how to get started:\n\n1. Sign the Platform Agreement (2 min) — unlocks all live mandates\n2. Browse jobs and accept mandates that match your candidates\n3. Submit candidates directly from your dashboard\n4. Earn your fee when your candidate joins\n\nGo to your dashboard: ${BASE_URL}/consultant/dashboard\n\nThe TRICCI Team`,
  });
}

// ─── 2. Agreement reminder (sent on first login if unsigned) ──────────────────
export async function sendAgreementReminderEmail(to: string, name: string): Promise<void> {
  const firstName = name.split(' ')[0];
  const html = wrapper(`
    <tr>
      <td style="padding:28px 32px 8px;">
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff;line-height:1.2;">
          One step left, ${firstName}
        </h1>
        <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">
          You&rsquo;re almost ready to start earning. Sign the TRICCI Platform Agreement to unlock
          access to all live mandates and submit your first candidate.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a0a00;border:1px solid ${ORANGE}30;border-radius:12px;margin-bottom:24px;">
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${ORANGE};">Why sign the agreement?</p>
              <ul style="margin:8px 0 0;padding-left:18px;color:${MUTED};font-size:13px;line-height:1.8;">
                <li>Unlocks all live job mandates instantly</li>
                <li>Protects your fee share (6% of CTC)</li>
                <li>Enables direct candidate submissions</li>
                <li>Takes less than 2 minutes to complete</li>
              </ul>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 32px;">
        ${btn('Sign Agreement Now', `${BASE_URL}/consultant/dashboard`)}
      </td>
    </tr>
  `);

  await sendEmail({
    to,
    subject: `${firstName}, your TRICCI mandates are waiting — sign in 2 minutes`,
    html,
    text: `Hi ${firstName},\n\nYou're one step away from accessing all live mandates on TRICCI.\n\nSign the Platform Agreement (takes 2 minutes) to:\n- Unlock all live job mandates\n- Protect your 6% fee share\n- Submit candidates directly\n\nSign now: ${BASE_URL}/consultant/dashboard\n\nThe TRICCI Team`,
  });
}

// ─── 3. Agreement confirmed ───────────────────────────────────────────────────
export async function sendAgreementConfirmedEmail(
  to: string,
  name: string,
  agencyName: string,
  hash: string,
): Promise<void> {
  const firstName = name.split(' ')[0];
  const signedAt = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const html = wrapper(`
    <tr>
      <td style="padding:28px 32px 8px;">
        <div style="display:inline-block;background:#22c55e15;border:1px solid #22c55e30;border-radius:8px;padding:6px 14px;margin-bottom:16px;">
          <span style="font-size:12px;font-weight:700;color:#22c55e;">✓ Agreement Signed</span>
        </div>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff;line-height:1.2;">
          You&rsquo;re all set, ${firstName}!
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:${MUTED};line-height:1.6;">
          Your TRICCI Platform Agreement has been digitally executed and recorded.
          You now have full access to all live mandates.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #ffffff0d;border-radius:12px;margin-bottom:24px;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.8px;">Execution Record</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${[
                ['Signatory', name],
                ['Agency', agencyName],
                ['Signed At', `${signedAt} IST`],
                ['Reference Hash', hash.slice(0, 16) + '…'],
              ].map(([k, v]) => `
              <tr>
                <td style="padding:4px 0;font-size:12px;color:#555;width:120px;">${k}</td>
                <td style="padding:4px 0;font-size:12px;color:${TEXT};font-weight:600;">${v}</td>
              </tr>`).join('')}
            </table>
          </td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 32px;">
        ${btn('Browse Live Mandates', `${BASE_URL}/consultant/dashboard`)}
        <p style="margin:16px 0 0;font-size:12px;color:#555;">
          Keep this email as your agreement receipt. The full hash is on record in your dashboard.
        </p>
      </td>
    </tr>
  `);

  await sendEmail({
    to,
    subject: `Agreement confirmed — welcome aboard, ${firstName}`,
    html,
    text: `Hi ${firstName},\n\nYour TRICCI Platform Agreement has been signed and recorded.\n\nExecution details:\n- Signatory: ${name}\n- Agency: ${agencyName}\n- Signed: ${signedAt} IST\n- Reference: ${hash.slice(0, 16)}…\n\nYou now have full access to all live mandates.\n\nBrowse jobs: ${BASE_URL}/consultant/dashboard\n\nThe TRICCI Team`,
  });
}

// ─── 4. Jobs ready nudge (sent after agreement, prompts first job browse) ─────
export async function sendJobsReadyEmail(to: string, name: string, jobCount: number): Promise<void> {
  const firstName = name.split(' ')[0];
  const html = wrapper(`
    <tr>
      <td style="padding:28px 32px 8px;">
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#fff;line-height:1.2;">
          ${jobCount > 0 ? `${jobCount} live mandates are waiting for you` : 'Live mandates are waiting for you'}
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:${MUTED};line-height:1.6;">
          Now that your agreement is signed, you have full access to every open mandate on TRICCI.
          Accept the ones that match your candidate pool and start submitting.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            ${[
              { label: '0% upfront', sub: 'No subscription fee', color: ORANGE },
              { label: '6% fee share', sub: 'On every placement', color: PURPLE },
              { label: 'Fast payouts', sub: 'Within 30 days', color: '#22c55e' },
            ].map(c => `
            <td style="width:33%;padding:0 6px 0 0;">
              <div style="background:${c.color}10;border:1px solid ${c.color}25;border-radius:10px;padding:14px;text-align:center;">
                <p style="margin:0 0 2px;font-size:15px;font-weight:900;color:${c.color};">${c.label}</p>
                <p style="margin:0;font-size:11px;color:#555;">${c.sub}</p>
              </div>
            </td>`).join('')}
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 32px;">
        ${btn('Browse Mandates Now', `${BASE_URL}/consultant/dashboard`)}
      </td>
    </tr>
  `);

  await sendEmail({
    to,
    subject: `${jobCount > 0 ? `${jobCount} mandates` : 'Live mandates'} ready for you on TRICCI`,
    html,
    text: `Hi ${firstName},\n\nYour agreement is signed — you now have full access to all live mandates on TRICCI.\n\n• 0% upfront cost\n• 6% fee share on every placement\n• Fast payouts within 30 days\n\nBrowse mandates: ${BASE_URL}/consultant/dashboard\n\nThe TRICCI Team`,
  });
}
