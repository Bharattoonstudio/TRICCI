/**
 * TRICCI Candidate Signup Email — Colorful welcome for job seekers
 * "Looking for your dream job... tricci? We make it easy."
 * Sent immediately after signup confirmation
 */

import { sendEmail } from '@/server/email.js';

const GREEN_START = '#10B981';
const GREEN_MID = '#34D399';
const GREEN_END = '#6EE7B7';
const ACCENT_RED = '#EF4444';
const ACCENT_BLUE = '#6366F1';
const ACCENT_AMBER = '#F59E0B';
const BG = '#f5f5f5';
const BASE = 'https://www.tricci.in';

export async function sendCandidateSignupEmail(email: string, name: string) {
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
          background: linear-gradient(135deg, ${GREEN_START} 0%, ${GREEN_MID} 50%, ${GREEN_END} 100%);
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
        .feature-box.green { background: #ECFDF5; border-left-color: ${GREEN_START}; }
        .feature-box.red { background: #FEE2E2; border-left-color: ${ACCENT_RED}; }
        .feature-box.blue { background: #E0E7FF; border-left-color: ${ACCENT_BLUE}; }
        .feature-box.amber { background: #FEF3C7; border-left-color: ${ACCENT_AMBER}; }
        .feature-icon { font-size: 20px; margin-bottom: 0.5rem; }
        .feature-title { color: #333; font-size: 13px; font-weight: 600; margin: 0 0 0.4rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .feature-desc { color: #666; font-size: 12px; margin: 0; line-height: 1.5; }
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, ${GREEN_START} 0%, ${GREEN_MID} 100%);
          color: white;
          padding: 14px 40px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 15px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          text-align: center;
          display: block;
          margin: 0 auto 2rem;
          width: fit-content;
        }
        .pro-tip-box { background: #ECFDF5; padding: 1.5rem; border-radius: 8px; }
        .pro-tip-box p { margin: 0; color: #666; }
        .pro-tip-box strong { color: #333; }
        .pro-tip-box a { color: ${GREEN_START}; text-decoration: none; font-weight: 600; }
        .footer { background: #2C2C2C; color: #999; padding: 2rem; text-align: center; font-size: 12px; }
        .footer strong { color: white; font-size: 14px; }
        .footer a { color: ${GREEN_START}; text-decoration: none; margin: 0 12px; }
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
            <h1>Looking for your dream job... tricci?</h1>
            <p>We make it easy.</p>
          </div>
        </div>

        <!-- MAIN CONTENT -->
        <div class="content">
          <div class="welcome">
            <h2>Welcome to TRICCI World! 🚀</h2>
            <p>Congratulations! Your profile is live and employers are already looking at you. Your next great opportunity could be just one click away.</p>
          </div>

          <!-- FEATURES GRID -->
          <div class="features">
            <div class="feature-box green">
              <div class="feature-icon">🎯</div>
              <div class="feature-title">Smart Job Matches</div>
              <div class="feature-desc">Get personalized job recommendations</div>
            </div>
            <div class="feature-box red">
              <div class="feature-icon">❤️</div>
              <div class="feature-title">Save Your Favorites</div>
              <div class="feature-desc">Bookmark jobs & get alerts on new matches</div>
            </div>
            <div class="feature-box blue">
              <div class="feature-icon">💬</div>
              <div class="feature-title">Chat with Employers</div>
              <div class="feature-desc">Direct communication with hiring teams</div>
            </div>
            <div class="feature-box amber">
              <div class="feature-icon">📈</div>
              <div class="feature-title">Track Applications</div>
              <div class="feature-desc">Monitor your application progress in real-time</div>
            </div>
          </div>

          <!-- CTA BUTTON -->
          <a href="${BASE}/candidate/dashboard" class="cta-button">Explore Jobs Now →</a>

          <!-- PRO TIP BOX -->
          <div class="pro-tip-box">
            <p><strong>💡 Pro Tip: Complete your profile 100%</strong></p>
            <p style="margin-top: 0.8rem;">Profiles that are 100% complete get 5x more job matches. <a href="${BASE}/candidate/profile">Finish it now →</a></p>
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
    subject: `Welcome to TRICCI, ${firstName}! Your dream job awaits 💚`,
    html,
  });
}
