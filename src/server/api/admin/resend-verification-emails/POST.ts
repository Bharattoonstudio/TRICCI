/**
 * Admin Endpoint: Resend Verification Emails
 *
 * Sends verification emails to all unverified users.
 * Uses BetterAuth's verification system to create tokens + Brevo for delivery.
 *
 * Protected: Admin role only
 * Usage: POST /api/admin/resend-verification-emails
 * Response: { success: true, sent: 16, failed: 0, message: "..." }
 */

import { db } from '@/server/db/client.js';
import { user, verification } from '@/server/db/schema.js';
import { sql } from 'drizzle-orm';
import { sendEmail } from '@/server/email.js';
import { randomBytes } from 'crypto';

interface UnverifiedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Generate a verification token (matching BetterAuth approach)
 */
function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Build verification email HTML
 */
function buildVerificationEmail(name: string, email: string, role: string, verificationUrl: string): string {
  const firstName = name.split(' ')[0];

  // Role-specific accent colors
  const accentMap: Record<string, string> = {
    employer: '#35c9ff',
    consultant: '#E8470A',
    candidate: '#ffd035',
  };
  const accent = accentMap[role] || '#FF6B35';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Verify Your TRICCI Email</title>
</head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:48px 16px 64px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:580px;" cellpadding="0" cellspacing="0">

          <!-- TOP GLOW BAR -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#E8470A 0%,#6B4FBB 50%,${accent} 100%);border-radius:3px 3px 0 0;"></td>
          </tr>

          <!-- MAIN CARD -->
          <tr>
            <td style="background:#111111;border-radius:0 0 20px 20px;border:1px solid #ffffff0d;border-top:none;overflow:hidden;">

              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 36px 0;">
                    <span style="font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;">
                      TRI<span style="color:#E8470A;">CC</span>I
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Hero Section -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:36px 36px 0;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;color:#E8470A;text-transform:uppercase;">
                      ✦ &nbsp;Verify Your Account
                    </p>
                    <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#f0f0f0;line-height:1.25;letter-spacing:-0.5px;">
                      ${firstName}, let'"'"'s activate your account
                    </h1>
                    <p style="margin:0 0 28px;font-size:15px;color:#888888;line-height:1.6;">
                      Click the button below to verify your email address and get started on India'"'"'s most transparent recruitment platform.
                    </p>

                    <!-- CTA Button -->
                    <a href="${verificationUrl}"
                       style="display:inline-block;background:linear-gradient(135deg,#E8470A 0%,#6B4FBB 100%);color:#ffffff;font-size:14px;font-weight:800;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;box-shadow:0 4px 24px #E8470A40;">
                      Verify Email Address →
                    </a>

                    <p style="margin:24px 0 0;font-size:12px;color:#666666;">
                      This link expires in 24 hours. If you didn'"'"'t create an account, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 36px 0;">
                    <div style="height:1px;background:linear-gradient(90deg,transparent,#ffffff12,transparent);"></div>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 36px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="background:#181818;border:1px solid #ffffff0f;border-radius:14px;">
                      <tr>
                        <td style="padding:20px 24px;">
                          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#f0f0f0;">
                            Why verify your email?
                          </p>
                          <ul style="margin:0;padding-left:20px;color:#888888;font-size:13px;line-height:1.6;">
                            <li>Secure your account</li>
                            <li>Access all features</li>
                            <li>Receive important notifications</li>
                          </ul>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 36px 36px;">
                    <div style="height:1px;background:linear-gradient(90deg,transparent,#ffffff0a,transparent);margin-bottom:24px;"></div>
                    <p style="margin:0;font-size:11px;color:#444444;line-height:1.6;">
                      © 2026 TRICCI · India'"'"'s Recruitment Aggregator<br/>
                      <a href="https://tricci.in" style="color:#555555;text-decoration:none;">tricci.in</a>
                      &nbsp;·&nbsp;
                      <a href="mailto:support@tricci.in" style="color:#555555;text-decoration:none;">Support</a>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- BOTTOM GLOW -->
          <tr>
            <td style="padding-top:32px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#333333;letter-spacing:0.5px;">
                Haven'"'"'t signed up yet? <a href="https://tricci.in/signup" style="color:#555555;text-decoration:none;">Join TRICCI</a>
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Admin check: require authenticated admin session
    const { getAuth } = await import('@/lib/auth/auth.js');
    const { toWebRequest } = await import('@/lib/auth/express-adapter.js');

    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });

    if (!session?.user || session.user.isAdmin !== true) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    console.log('✓ Resend verification emails endpoint called');

    // Fetch all unverified users
    const unverifiedUsers = (await db.execute(
      sql`SELECT id, email, name, role FROM "user" WHERE email_verified = false ORDER BY created_at DESC`
    )).rows as UnverifiedUser[];

    if (unverifiedUsers.length === 0) {
      return res.status(200).json({
        success: true,
        sent: 0,
        failed: 0,
        message: 'No unverified users found',
      });
    }

    const results: Array<{ email: string; status: 'sent' | 'failed'; message: string }> = [];
    let sentCount = 0;
    let failedCount = 0;

    const baseUrl = process.env.BETTER_AUTH_URL || 'https://tricci.in';

    // Process each unverified user
    for (const u of unverifiedUsers) {
      try {
        // Generate verification token
        const token = generateVerificationToken();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Check if verification record already exists
        const existing = (await db.execute(
          sql`SELECT id FROM verification WHERE email = ${u.email} AND expires_at > NOW()`
        )).rows;

        // Delete old/expired verification records for this email
        await db.execute(sql`DELETE FROM verification WHERE email = ${u.email}`);

        // Insert new verification token (BetterAuth'"'"'s verification table schema)
        await db.execute(
          sql`INSERT INTO verification (email, token, expires_at) VALUES (${u.email}, ${token}, ${expiresAt})`
        );

        // Build verification URL
        const verificationUrl = `${baseUrl}/verify-email?token=${token}&email=${encodeURIComponent(u.email)}`;

        // Build and send email
        const emailHtml = buildVerificationEmail(u.name || u.email, u.email, u.role, verificationUrl);

        await sendEmail({
          to: u.email,
          subject: `${u.name?.split(' ')[0] || 'Hey'}, verify your TRICCI email 🚀`,
          html: emailHtml,
          text: `Hi ${u.name?.split(' ')[0] || 'there'},\n\nVerify your email to activate your TRICCI account:\n\n${verificationUrl}\n\nThis link expires in 24 hours.\n\n— The TRICCI Team`,
        });

        results.push({
          email: u.email,
          status: 'sent',
          message: `Verification email sent to ${u.email}`,
        });
        sentCount++;
        console.log(`✓ Verification email sent to ${u.email}`);
      } catch (emailError) {
        failedCount++;
        results.push({
          email: u.email,
          status: 'failed',
          message: `Failed to send: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`,
        });
        console.error(`✗ Failed to send verification email to ${u.email}:`, emailError);
      }
    }

    return res.status(200).json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      message: `${sentCount} verification emails sent, ${failedCount} failed`,
      results,
    });
  } catch (error) {
    console.error('resend-verification-emails.error', error);
    return res.status(500).json({
      message: 'Failed to resend verification emails',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
