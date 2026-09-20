/**
 * POST /api/auth/forgot-password
 *
 * Forgot password endpoint for email-based password reset.
 *
 * This endpoint:
 * 1. Receives user email
 * 2. Generates reset token
 * 3. Sends email with reset link
 * 4. Returns success message (doesn't reveal if email exists)
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client';
import { user, verification } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/server/email';
import crypto from 'crypto';

export default async function handler(req: Request, res: Response) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Security: Don't reveal whether email exists
    // Generate response regardless
    try {
      // Find user by email
      const foundUser = await db.query.user.findFirst({
        where: eq(user.email, normalizedEmail),
      });

      if (foundUser) {
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Store verification record
        await db
          .insert(verification)
          .values({
            id: resetToken, // For lookup
            identifier: normalizedEmail,
            token: resetTokenHash,
            expiresAt,
          })
          .onConflictDoUpdate({
            target: verification.identifier,
            set: {
              token: resetTokenHash,
              expiresAt,
            },
          });

        // Build reset link
        const baseURL = process.env.BETTER_AUTH_URL || 'https://tricci.in';
        const resetLink = `${baseURL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`;

        // Send email with reset link
        await sendEmail({
          to: normalizedEmail,
          subject: 'Reset your TRICCI password',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1A0A00;color:#F5F5F5;border-radius:12px;">
              <h1 style="color:#FF6B35;font-size:24px;margin:0 0 8px;">Reset your password</h1>
              <p style="color:#aaa;margin:0 0 24px;">Hi ${foundUser.name}, click the button below to set a new password for your TRICCI account.</p>
              <a href="${resetLink}" style="display:inline-block;background:#FF6B35;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">Reset Password</a>
              <p style="color:#666;font-size:12px;margin-top:24px;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
          text: `Reset your TRICCI password: ${resetLink}`,
        });

        console.log(`[FORGOT_PASSWORD] ✅ Reset email sent to: ${normalizedEmail}`);
      } else {
        console.log(`[FORGOT_PASSWORD] ⚠️ No user found for: ${normalizedEmail}`);
      }
    } catch (innerError) {
      const errorMsg = innerError instanceof Error ? innerError.message : 'Unknown error';
      console.error(`[FORGOT_PASSWORD] Error processing ${normalizedEmail}: ${errorMsg}`);
    }

    // Always return success to prevent email enumeration attacks
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent to your email',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[FORGOT_PASSWORD_ERROR] ${message}`);

    return res.status(500).json({
      error: 'Failed to process password reset request',
    });
  }
}
