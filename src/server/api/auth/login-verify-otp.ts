import { db } from '@/server/db/client';
import { otp_store, user, session } from '@/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
          return res.status(405).json({ error: 'Method not allowed' });
    }

  try {
        const { email, otp } = req.body;

      if (!email || !otp) {
              return res.status(400).json({ error: 'Email and OTP are required' });
      }

      // Find OTP record
      const otpRecord = await db.query.otp_store.findFirst({
              where: and(
                        eq(otp_store.identifier, email),
                        eq(otp_store.otp, otp),
                        eq(otp_store.purpose, 'login')
                      ),
      });

      if (!otpRecord) {
              return res.status(400).json({ error: 'Invalid OTP' });
      }

      if (otpRecord.expires_at < new Date()) {
              return res.status(400).json({ error: 'OTP has expired' });
      }

      // Get user
      const foundUser = await db.query.user.findFirst({
              where: eq(user.email, email),
      });

      if (!foundUser) {
              return res.status(400).json({ error: 'User not found' });
      }

      // Create session
      const sessionToken = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(session).values({
              token: sessionToken,
              user_id: foundUser.id,
              expires_at: expiresAt,
      });

      // Mark OTP as verified
      await db.update(otp_store).set({ verified: true }).where(eq(otp_store.id, otpRecord.id));

      res.setHeader('Set-Cookie', `sessionToken=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);

      console.log('[LOGIN-VERIFY-OTP] Login successful for user:', foundUser.id);

      return res.status(200).json({
              success: true,
              message: 'Login successful',
              userId: foundUser.id,
              email: foundUser.email,
              name: foundUser.name,
              role: foundUser.role,
              sessionToken,
      });
  } catch (error) {
        console.error('[LOGIN-VERIFY-OTP] Error:', error);
        return res.status(500).json({ error: 'Failed to verify OTP' });
  }
}
