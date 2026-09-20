/**
 * POST /api/auth/reset-password
 *
 * Reset password endpoint - validates reset token and updates user password.
 *
 * This endpoint:
 * 1. Validates reset token and email
 * 2. Checks token expiration
 * 3. Hashes new password with bcrypt
 * 4. Updates account record with new password
 * 5. Invalidates token after use
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client';
import { user, account, verification } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export default async function handler(req: Request, res: Response) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token, email, password } = req.body;

    // Validate inputs
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Reset token is required' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'New password is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Hash token for comparison
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find verification record
    const verificationRecord = await db.query.verification.findFirst({
      where: and(
        eq(verification.identifier, normalizedEmail),
        eq(verification.token, tokenHash)
      ),
    });

    if (!verificationRecord) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    // Check expiration
    if (new Date() > verificationRecord.expiresAt) {
      return res.status(401).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // Find user
    const foundUser = await db.query.user.findFirst({
      where: eq(user.email, normalizedEmail),
    });

    if (!foundUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update account with new password
    await db
      .update(account)
      .set({
        password: hashedPassword,
      })
      .where(and(
        eq(account.userId, foundUser.id),
        eq(account.provider, 'credential')
      ));

    // Invalidate token by deleting verification record
    await db
      .delete(verification)
      .where(eq(verification.identifier, normalizedEmail));

    console.log(`[RESET_PASSWORD] ✅ Password reset successful for: ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[RESET_PASSWORD_ERROR] ${message}`);

    return res.status(500).json({
      error: 'Failed to reset password',
    });
  }
}
