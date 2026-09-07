/**
 * TRICCI Welcome Email — sent once after email verification for all roles.
 *
 * Designed to feel like stepping into the future:
 * dark background, gradient accents, animated-feel layout,
 * role-specific copy, and login credentials reminder.
 */

import { sendEmail } from '@/server/email.js';

const ORANGE = '#E8470A';
const PURPLE = '#6B4FBB';
const BG = '#080808';
const CARD = '#111111';
const CARD2 = '#181818';
const TEXT = '#f0f0f0';
const MUTED = '#888888';
const BASE = 'https://tricci.in';

// ─── Role-specific content ────────────────────────────────────────────────────

interface RoleContent {
  headline: string;
  subheadline: string;
  tagline: string;
  ctaLabel: string;
  ctaUrl: string;
  accentColor: string;
  badge: string;
  features: { icon: string; title: string; desc: string }[];
  closingLine: string;
}

function getRoleContent(role: string, name: string): RoleContent {
  const firstName = name.split(' ')[0];

  if (role === 'employer') {
    return {
      headline: `${firstName}, your talent pipeline just got smarter.`,
      subheadline: 'You\'re now inside India\'s most transparent recruitment marketplace.',
      tagline: 'Post jobs. Get matched. Pay only on success.',
      ctaLabel: 'Post Your First Job →',
      ctaUrl: `${BASE}/employer/dashboard`,
      accentColor: '#35c9ff',
      badge: '🏢 EMPLOYER',
      features: [
        { icon: '⚡', title: 'Zero upfront cost', desc: 'Post unlimited jobs. Pay only when you hire.' },
        { icon: '🤝', title: 'Verified consultant network', desc: 'Access 500+ screened recruitment consultants across India.' },
        { icon: '📊', title: 'Full ATS included', desc: 'Track every candidate from submission to offer — all in one place.' },
        { icon: '🔒', title: 'Fee transparency', desc: 'Know exactly what you\'ll pay before you hire. No surprises.' },
      ],
      closingLine: 'The best hire of your career starts here. We\'re rooting for you.',
    };
  }

  if (role === 'consultant') {
    return {
      headline: `${firstName}, your recruitment business just levelled up.`,
      subheadline: 'Welcome to the platform built exclusively for independent recruiters.',
      tagline: 'Submit candidates. Track progress. Earn % of every placement fee.',
      ctaLabel: 'Browse Live Mandates →',
      ctaUrl: `${BASE}/consultant/dashboard`,
      accentColor: ORANGE,
      badge: '⭐ CONSULTANT',
      features: [
        { icon: '💰', title: '% fee share', desc: 'The highest payout in India\'s recruitment industry. Guaranteed.' },
        { icon: '📋', title: 'Live mandates daily', desc: 'Fresh job mandates from verified employers — updated every day.' },
        { icon: '🚀', title: 'Submit in 60 seconds', desc: 'Upload CV, fill details, submit. No paperwork. No gatekeepers.' },
        { icon: '📈', title: 'Real-time dashboard', desc: 'Track every submission, shortlist, and payout in real time.' },
      ],
      closingLine: 'This is your moment. The mandates are live. Go place someone great.',
    };
  }

  // candidate (default)
  return {
    headline: `${firstName}, your next big career move starts now.`,
    subheadline: 'You\'ve just joined India\'s smartest job discovery platform.',
    tagline: 'Get discovered. Get placed. Get paid what you\'re worth.',
    ctaLabel: 'Complete Your Profile →',
    ctaUrl: `${BASE}/candidate/profile`,
    accentColor: '#ffd035',
    badge: '🌟 CANDIDATE',
    features: [
      { icon: '🎯', title: 'AI-matched opportunities', desc: 'Our AI matches your profile to the right jobs — before you even search.' },
      { icon: '👁️', title: 'Visible to top consultants', desc: '500+ verified consultants can discover and submit you for roles.' },
      { icon: '📱', title: 'One-click apply', desc: 'Apply to any job in seconds. Your CV travels with you.' },
      { icon: '🔔', title: 'Smart job alerts', desc: 'Get notified the moment a role matching your profile goes live.' },
    ],
    closingLine: 'Your dream role is already on TRICCI. Let\'s go find it.',
  };
}

// ─── Email builder ────────────────────────────────────────────────────────────

function buildWelcomeEmail(name: string, email: string, role: string): string {
  const rc = getRoleContent(role, name);
  const accent = rc.accentColor;

  const featureRows = rc.features.map(f => `
    <tr>
      <td style="padding:0 0 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="48" valign="top" style="padding-right:16px;">
              <div style="width:44px;height:44px;border-radius:12px;background:${CARD2};border:1px solid #ffffff12;display:flex;align-items:center;justify-content:center;font-size:22px;text-align:center;line-height:44px;">
                ${f.icon}
              </div>
            </td>
            <td valign="top">
              <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${TEXT};">${f.title}</p>
              <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.5;">${f.desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Welcome to TRICCI</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:48px 16px 64px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0">

          <!-- ── TOP GLOW BAR ── -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,${ORANGE} 0%,${PURPLE} 50%,${accent} 100%);border-radius:3px 3px 0 0;"></td>
          </tr>

          <!-- ── MAIN CARD ── -->
          <tr>
            <td style="background:${CARD};border-radius:0 0 20px 20px;border:1px solid #ffffff0d;border-top:none;overflow:hidden;">

              <!-- Logo + badge row -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 36px 0;display:flex;align-items:center;justify-content:space-between;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <!-- TRICCI wordmark -->
                          <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">
                            TRI<span style="color:${ORANGE};">CC</span>I
                          </span>
                        </td>
                        <td align="right">
                          <span style="font-size:10px;font-weight:800;letter-spacing:1.5px;color:${accent};background:${accent}18;border:1px solid ${accent}30;padding:4px 10px;border-radius:20px;">
                            ${rc.badge}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── HERO SECTION ── -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 36px 0;">

                    <!-- Animated-feel headline -->
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;color:${ORANGE};text-transform:uppercase;">
                      ✦ &nbsp;Welcome to the future of recruitment
                    </p>
                    <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:${TEXT};line-height:1.25;letter-spacing:-0.5px;">
                      ${rc.headline}
                    </h1>
                    <p style="margin:0 0 8px;font-size:15px;color:${MUTED};line-height:1.6;">
                      ${rc.subheadline}
                    </p>
                    <p style="margin:0 0 28px;font-size:14px;font-weight:600;color:${accent};">
                      ${rc.tagline}
                    </p>

                    <!-- CTA Button -->
                    <a href="${rc.ctaUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,${ORANGE} 0%,${PURPLE} 100%);color:#ffffff;font-size:14px;font-weight:800;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 24px ${ORANGE}40;">
                      ${rc.ctaLabel}
                    </a>

                  </td>
                </tr>
              </table>

              <!-- ── DIVIDER ── -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 36px 0;">
                    <div style="height:1px;background:linear-gradient(90deg,transparent,#ffffff12,transparent);"></div>
                  </td>
                </tr>
              </table>

              <!-- ── FEATURES ── -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 36px 0;">
                    <p style="margin:0 0 20px;font-size:12px;font-weight:700;letter-spacing:1.5px;color:${MUTED};text-transform:uppercase;">
                      What&apos;s waiting for you
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${featureRows}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── DIVIDER ── -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px 36px 0;">
                    <div style="height:1px;background:linear-gradient(90deg,transparent,#ffffff12,transparent);"></div>
                  </td>
                </tr>
              </table>

              <!-- ── LOGIN CREDENTIALS CARD ── -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 36px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:${CARD2};border:1px solid #ffffff0f;border-radius:14px;overflow:hidden;">
                      <tr>
                        <td style="padding:4px 0;background:linear-gradient(90deg,${ORANGE}40,${PURPLE}40);"></td>
                      </tr>
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:${ORANGE};text-transform:uppercase;">
                            🔐 &nbsp;Your Login Credentials
                          </p>
                          <p style="margin:0 0 16px;font-size:12px;color:${MUTED};">
                            Save these somewhere safe — you&apos;ll need them every time you log in.
                          </p>
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding:0 0 10px;">
                                <table width="100%" cellpadding="0" cellspacing="0"
                                       style="background:#0d0d0d;border:1px solid #ffffff0a;border-radius:10px;">
                                  <tr>
                                    <td style="padding:12px 16px;">
                                      <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:1px;color:${MUTED};text-transform:uppercase;">Login URL</p>
                                      <a href="${BASE}/login" style="font-size:13px;font-weight:600;color:${accent};text-decoration:none;">${BASE}/login</a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:0 0 10px;">
                                <table width="100%" cellpadding="0" cellspacing="0"
                                       style="background:#0d0d0d;border:1px solid #ffffff0a;border-radius:10px;">
                                  <tr>
                                    <td style="padding:12px 16px;">
                                      <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:1px;color:${MUTED};text-transform:uppercase;">Email Address</p>
                                      <p style="margin:0;font-size:13px;font-weight:600;color:${TEXT};">${email}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <table width="100%" cellpadding="0" cellspacing="0"
                                       style="background:#0d0d0d;border:1px solid #ffffff0a;border-radius:10px;">
                                  <tr>
                                    <td style="padding:12px 16px;">
                                      <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:1px;color:${MUTED};text-transform:uppercase;">Password</p>
                                      <p style="margin:0;font-size:13px;font-weight:600;color:${MUTED};">
                                        The password you set during signup &nbsp;
                                        <span style="font-size:11px;color:#ffffff30;">(we never store it in plain text)</span>
                                      </p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── AI WORLD MOMENT ── -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 36px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:linear-gradient(135deg,${ORANGE}12 0%,${PURPLE}12 100%);border:1px solid ${ORANGE}20;border-radius:14px;">
                      <tr>
                        <td style="padding:24px;">
                          <p style="margin:0 0 8px;font-size:20px;">🌐</p>
                          <p style="margin:0 0 8px;font-size:15px;font-weight:800;color:${TEXT};line-height:1.3;">
                            You just walked into the AI era of recruitment.
                          </p>
                          <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">
                            TRICCI is not just a platform — it&apos;s a movement. We&apos;re rebuilding how India hires,
                            one transparent placement at a time. You made the right call joining us.
                            The best companies, the sharpest consultants, and the most ambitious candidates
                            are all right here. <strong style="color:${TEXT};">Welcome to where careers are made.</strong>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── CLOSING ── -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 36px 0;">
                    <p style="margin:0 0 4px;font-size:14px;color:${MUTED};line-height:1.6;">
                      ${rc.closingLine}
                    </p>
                    <p style="margin:16px 0 0;font-size:14px;color:${TEXT};font-weight:700;">
                      With energy,<br/>
                      <span style="color:${ORANGE};">The TRICCI Team</span>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- ── FOOTER ── -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 36px 36px;">
                    <div style="height:1px;background:linear-gradient(90deg,transparent,#ffffff0a,transparent);margin-bottom:24px;"></div>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:11px;color:#444444;line-height:1.6;">
                            You received this email because you created a TRICCI account.<br/>
                            <a href="${BASE}" style="color:#555555;text-decoration:none;">tricci.in</a>
                            &nbsp;·&nbsp;
                            <a href="${BASE}/login" style="color:#555555;text-decoration:none;">Login</a>
                            &nbsp;·&nbsp;
                            <a href="mailto:support@tricci.in" style="color:#555555;text-decoration:none;">Support</a>
                          </p>
                        </td>
                        <td align="right">
                          <span style="font-size:13px;font-weight:900;color:#333333;letter-spacing:-0.3px;">
                            TRI<span style="color:#E8470A40;">CC</span>I
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── BOTTOM GLOW ── -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#333333;letter-spacing:0.5px;">
                © 2026 TRICCI · India&apos;s Recruitment Aggregator
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

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: string,
): Promise<void> {
  const roleLabel = role === 'employer' ? 'Employer' : role === 'consultant' ? 'Consultant' : 'Candidate';
  const firstName = name.split(' ')[0];

  await sendEmail({
    to: email,
    subject: `${firstName}, welcome to TRICCI — you're in. 🚀`,
    html: buildWelcomeEmail(name, email, role),
    text: [
      `Welcome to TRICCI, ${firstName}!`,
      '',
      `You've successfully joined as a ${roleLabel}.`,
      '',
      `Login at: ${BASE}/login`,
      `Email: ${email}`,
      `Password: The one you set during signup (we never store it in plain text).`,
      '',
      'Save your credentials somewhere safe.',
      '',
      '— The TRICCI Team',
    ].join('\n'),
  });
}
