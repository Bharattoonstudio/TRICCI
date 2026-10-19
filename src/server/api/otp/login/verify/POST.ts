/**
 * POST /api/otp/login/verify
 * Public endpoint — no session required.
 * Used during login to verify OTP and create session.
 *
 * Body: { email: string, otp: string }
 * Returns: { success: true, verified: true, role: 'employer'|'consultant'|'candidate', user: {...} }
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { otpStore } from '@/server/db/schema.js';
import { hashOtp } from '@/server/lib/otpHash.js';
import { getAuth } from '@/lib/auth/auth.js';
import { eq, and, gt } from 'drizzle-orm';
import { createHmac } from 'crypto';

export default async function handler(req: Request, res: Response) {
  try {
    const { email, otp } = req.body as {
      email?: string;
      otp?: string;
    };

    if (!otp) {
      return res.status(400).json({ error: 'otp is required.' });
    }
    if (!email) {
      return res.status(400).json({ error: 'email is required.' });
    }

    // identifier must match exactly what send endpoint wrote
    const identifier = `email:${email.toLowerCase().trim()}`;

    const now = new Date();

    // Find the OTP record matching all criteria
    const rows = await db
      .select()
      .from(otpStore)
      .where(
        and(
          eq(otpStore.identifier, identifier),
          eq(otpStore.otp, hashOtp(identifier, 'login_mobile', otp)),
          eq(otpStore.purpose, 'login_mobile'),
          eq(otpStore.verified, false),
          gt(otpStore.expiresAt, now),
        ),
      )
      .limit(1);

    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }

    // OTP is valid — get user info
    const loginUser = await db.query.user.findFirst({
      where: (fields, { eq }) => eq(fields.email, email),
    });

    if (!loginUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a real BetterAuth session so the site's own useSession / getSession
    // recognise the user. This also runs BetterAuth's session hooks (suspended/removed accounts).
    const authCtx = await (getAuth() as any).$context;
    const betterSession = await authCtx.internalAdapter.createSession(loginUser.id, false);
    const sessionToken: string = betterSession.token;

    // BetterAuth expects its session cookie signed as `token.HMAC-SHA256(token)` (base64), URL-encoded.
    const signature = createHmac('sha256', authCtx.secret)
      .update(sessionToken)
      .digest('base64');
    const signedValue = encodeURIComponent(`${sessionToken}.${signature}`);

    const cookieName: string = authCtx.authCookies.sessionToken.name;
    const maxAgeSeconds = 30 * 24 * 60 * 60;
    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';

    console.log(`[otp.login.verify] Session created for user ${loginUser.id}`);

    // Set the BetterAuth session cookie (HttpOnly, SameSite=Lax) and the legacy sessionToken cookie
    // used by the custom session middleware. Raw header so the value is not encoded twice.
    res.append('Set-Cookie', `${cookieName}=${signedValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag}`);
    res.append('Set-Cookie', `sessionToken=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secureFlag}`);

    // Delete OTP record (mark as used)
    await db.delete(otpStore).where(eq(otpStore.id, rows[0].id));

    console.log(`[otp.login.verify] OTP verified and deleted for email: ${email}`);

    // Return response with user data AND role for routing
    res.json({
      success: true,
      verified: true,
      role: loginUser.role,
      user: {
        id: loginUser.id,
        email: loginUser.email,
        name: loginUser.name,
        role: loginUser.role,
      },
    });
  } catch (err) {
    console.error('[otp.login.verify] ERROR:', err);
    res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
  }
}
