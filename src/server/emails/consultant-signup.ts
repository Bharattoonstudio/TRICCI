/**
 * TRICCI Consultant Signup Email — Colorful welcome for consultants
 * "Finding the right roles... tricci? We make it easy."
 * Sent immediately after signup confirmation
 */

import { sendEmail } from '@/server/email.js';

const PURPLE_START = '#7C3AED';
const PURPLE_MID = '#A855F7';
const PURPLE_END = '#C084FC';
const ACCENT_AMBER = '#F59E0B';
const ACCENT_BLUE = '#3B82F6';
const ACCENT_GREEN = '#22C55E';
const BG = '#f5f5f5';
const BASE = 'https://www.tricci.in';

export async function sendConsultantSignupEmail(email: string, name: string) {
  const firstName = name.split(' ')[0];

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: ${BG}; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .hero {
          background: linear-gradient(135deg, ${PURPLE_START} 0%, ${PURPLE_MID} 50%, ${PURPLE_END} 100%);
          padding: 3rem 2rem;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 400px;
          height: 400px;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          z-index: 0;
        }
        .hero-content { position: relative; z-index: 1; }
        .hero h1 { font-size: 32px; font-weight: 700; margin: 0 0 0.5rem; letter-spacing: -0.5px; }
        .hero p { font-size: 18px; margin: 0; font-weight: 300; opacity: 0.95; }
        .content { padding: 2.5rem 2rem; background: white; }
        .welcome h2 { color: #333; font-size: 24px; margin: 0 0 1rem; font-weight: 600; }
        .welcome p { color: #666; font-size: 15px; line-height: 1.7; margin: 0 0 1.5rem; }
        .features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .feature-box {
          padding: 1rem;
          border-radius: 4px;
          border-left: 4px solid;
        }
        .feature-box.purple { background: #F3E8FF; border-left-color: ${PURPLE_START}; }
        .feature-box.amber { background: #FEF3C7; border-left-color: ${ACCENT_AMBER}; }
        .feature-box.blue { background: #DBEAFE; border-left-color: ${ACCENT_BLUE}; }
        .feature-box.green { background: #DCFCE7; border-left-color: ${ACCENT_GREEN}; }
        .feature-icon { font-size: 20px; margin-bottom: 0.5rem; }
        .feature-title { color: #333; font-size: 13px; font-weight: 600; margin: 0 0 0.4rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .feature-desc { color: #666; font-size: 12px; margin: 0; line-height: 1.5; }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, ${PURPLE_START} 0%, ${PURPLE_MID} 100%);
          color: white;
          padding: 14px 40px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 15px;
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
          text-align: center;
          display: block;
          margin: 0 auto 2rem;
          width: fit-content;
        }
        .bonus-box { background: #F3E8FF; padding: 1.5rem; border-radius: 8px; }
        .bonus-box p { margin: 0; color: #666; }
        .bonus-box strong { color: #333; }
        .bonus-box a { color: ${PURPLE_START}; text-decoration: none; font-weight: 600; }
        .footer { background: #2C2C2C; color: #999; padding: 2rem; text-align: center; font-size: 12px; }
        .footer strong { color: white; font-size: 14px; }
        .footer a { color: ${PURPLE_START}; text-decoration: none; margin: 0 12px; }
        .footer p { margin: 0; opacity: 0.6; }
        @media (max-width: 600px) {
          .hero h1 { font-size: 24px; }
          .welcome h2 { font-size: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- HERO SECTION -->
        <div class="hero">
          <div class="hero-content">
            <h1>Finding the right roles... tricci?</h1>
            <p>We make it easy.</p>
          </div>
        </div>

        <!-- MAIN CONTENT -->
        <div class="content">
          <div class="welcome">
            <h2>Welcome to TRICCI World! 🚀</h2>
            <p>Congratulations! Your consultant account is now active. Connect with hundreds of employers and help them find their perfect candidates.</p>
          </div>

          <!-- FEATURES GRID -->
          <div class="features">
            <div class="feature-box purple">
              <div class="feature-icon">🔗</div>
              <div class="feature-title">Connect with Employers</div>
              <div class="feature-desc">Build relationships & grow network</div>
            </div>
            <div class="feature-box amber">
              <div class="feature-icon">💰</div>
              <div class="feature-title">Earn Commissions</div>
              <div class="feature-desc">Get rewarded for successful placements</div>
            </div>
            <div class="feature-box blue">
              <div class="feature-icon">📱</div>
              <div class="feature-title">Browse Job Orders</div>
              <div class="feature-desc">Access 1000+ active job openings</div>
            </div>
            <div class="feature-box green">
              <div class="feature-icon">⭐</div>
              <div class="feature-title">Build Your Profile</div>
              <div class="feature-desc">Showcase expertise & attract employers</div>
            </div>
          </div>

          <!-- CTA BUTTON -->
          <a href="${BASE}/consultant/dashboard" class="cta-button">Start Browsing Jobs →</a>

          <!-- BONUS BOX -->
          <div class="bonus-box">
            <p><strong>🎉 First placement bonus available!</strong></p>
            <p style="margin-top: 0.8rem;">Make your first placement and earn extra rewards. <a href="${BASE}/consultant/jobs">Browse jobs now →</a></p>
          </div>
        </div>

        <!-- FOOTER -->
        <div class="footer">
          <div><strong>TRICCI</strong></div>
          <p style="margin: 1rem 0 0;">© 2026 TRICCI. Making recruitment easy across India</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: email,
    subject: `Welcome to TRICCI, ${firstName}! Your next placement awaits 🎯`,
    html,
  });
}
