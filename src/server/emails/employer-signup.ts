/**
 * TRICCI Employer Signup Email — Colorful welcome for employers
 * "Are you finding hiring tricci? We make it easy."
 * Sent immediately after signup confirmation
 */

import { sendEmail } from '@/server/email.js';

const ORANGE_START = '#FF6B35';
const ORANGE_MID = '#FF8C52';
const ORANGE_END = '#FFA500';
const ACCENT_BLUE = '#00A3E0';
const ACCENT_PURPLE = '#7C3AED';
const ACCENT_GREEN = '#10B981';
const BG = '#f5f5f5';
const BASE = 'https://www.tricci.in';

export async function sendEmployerSignupEmail(email: string, name: string) {
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
          background: linear-gradient(135deg, ${ORANGE_START} 0%, ${ORANGE_MID} 50%, ${ORANGE_END} 100%);
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
        .feature-box.orange { background: #FFF4E6; border-left-color: ${ORANGE_START}; }
        .feature-box.blue { background: #E6F7FF; border-left-color: ${ACCENT_BLUE}; }
        .feature-box.purple { background: #F0E6FF; border-left-color: ${ACCENT_PURPLE}; }
        .feature-box.green { background: #E6F5E6; border-left-color: ${ACCENT_GREEN}; }
        .feature-icon { font-size: 20px; margin-bottom: 0.5rem; }
        .feature-title { color: #333; font-size: 13px; font-weight: 600; margin: 0 0 0.4rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .feature-desc { color: #666; font-size: 12px; margin: 0; line-height: 1.5; }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, ${ORANGE_START} 0%, ${ORANGE_MID} 100%);
          color: white;
          padding: 14px 40px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 15px;
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
          text-align: center;
          display: block;
          margin: 0 auto 2rem;
          width: fit-content;
        }
        .support-box { background: #FFF4E6; padding: 1.5rem; border-radius: 8px; }
        .support-box p { margin: 0; color: #666; }
        .support-box strong { color: #333; }
        .support-box a { color: ${ORANGE_START}; text-decoration: none; font-weight: 600; }
        .footer { background: #2C2C2C; color: #999; padding: 2rem; text-align: center; font-size: 12px; }
        .footer strong { color: white; font-size: 14px; }
        .footer a { color: ${ORANGE_START}; text-decoration: none; margin: 0 12px; }
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
            <h1>Are you finding hiring... tricci?</h1>
            <p>We make it easy.</p>
          </div>
        </div>

        <!-- MAIN CONTENT -->
        <div class="content">
          <div class="welcome">
            <h2>Welcome to TRICCI World! 🚀</h2>
            <p>Congratulations! Your employer account is now live. You're joining thousands of companies across India who are already making smarter hiring decisions with TRICCI.</p>
          </div>

          <!-- FEATURES GRID -->
          <div class="features">
            <div class="feature-box orange">
              <div class="feature-icon">⚡</div>
              <div class="feature-title">Post Jobs Instantly</div>
              <div class="feature-desc">Reach 100K+ candidates in seconds</div>
            </div>
            <div class="feature-box blue">
              <div class="feature-icon">🎯</div>
              <div class="feature-title">Smart Matching</div>
              <div class="feature-desc">AI-powered recommendations</div>
            </div>
            <div class="feature-box purple">
              <div class="feature-icon">📊</div>
              <div class="feature-title">Real-time Analytics</div>
              <div class="feature-desc">Track every hire from post to offer</div>
            </div>
            <div class="feature-box green">
              <div class="feature-icon">💬</div>
              <div class="feature-title">Direct Chat</div>
              <div class="feature-desc">Message candidates instantly</div>
            </div>
          </div>

          <!-- CTA BUTTON -->
          <a href="${BASE}/employer/dashboard" class="cta-button">Post Your First Job →</a>

          <!-- SUPPORT BOX -->
          <div class="support-box">
            <p><strong>Ready to hire smarter?</strong></p>
            <p style="margin-top: 0.8rem;">Our onboarding team is here for you. <a href="mailto:support@tricci.in">Schedule a demo</a> with us.</p>
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
    subject: `Welcome to TRICCI, ${firstName}! Your hiring journey starts now 🚀`,
    html,
  });
}
