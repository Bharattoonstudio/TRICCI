/**
 * POST /api/auth/forgot-password
 *
 * Forgot password endpoint - resets user password to default: FirstName@1234
 *
 * This endpoint:
 * 1. Receives user email
 * 2. Finds user by email
 * 3. Resets password to FirstName@1234
 * 4. Returns success message (no email sent, no Brevo dependency)
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client';
import { user, account } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

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

    try {
      // Find user by email
      const foundUser = await db.query.user.findFirst({
        where: eq(user.email, normalizedEmail),
      });

      if (foundUser) {
        // Extract first name from user.name
        const firstName = foundUser.name.split(' ')[0];

        // Generate default password: FirstName@1234
        const defaultPassword = `${firstName}@1234`;

        // Hash password
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);

        // Update account with new password
        await db
          .update(account)
          .set({
            password: hashedPassword,
          })
          .where(and(
            eq(account.userId, foundUser.id),
            eq(account.providerId, 'credential')
          ));

        console.log(`[FORGOT_PASSWORD] ✅ Password reset to default for: ${normalizedEmail}`);
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
      message: 'If an account with that email exists, your password has been reset to FirstName@1234',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[FORGOT_PASSWORD_ERROR] ${message}`);

    return res.status(500).json({
      error: 'Failed to process password reset request',
    });
  }
}
