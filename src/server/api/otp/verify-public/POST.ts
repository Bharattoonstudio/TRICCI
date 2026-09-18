import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { otpStore, user, candidateProfile, consultantProfile, employerProfile, session } from '@/server/db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export default async function handler(req: Request, res: Response) {
  try {
    const { email, phone, otp, role, name } = req.body as {
      email?: string;
      phone?: string;
      otp?: string;
      role?: string;
      name?: string;
    };

    if (!otp) {
      return res.status(400).json({ error: 'otp is required.' });
    }
    if (!email && !phone) {
      return res.status(400).json({ error: 'email or phone is required.' });
    }

    // identifier must match exactly what send-public wrote
    const identifier = email
      ? `email:${email.toLowerCase().trim()}`
      : `phone:${phone}`;

    const now = new Date();

    // Find the OTP record matching all criteria
    const rows = await db
      .select()
      .from(otpStore)
      .where(
        and(
          eq(otpStore.identifier, identifier),
          eq(otpStore.otp, otp),
          eq(otpStore.purpose, 'signup_mobile'),
          eq(otpStore.verified, false),
          gt(otpStore.expiresAt, now),
        ),
      )
      .limit(1);

    if (!rows.length) {
      return res.status(400).json({ error: 'Invalid or expired OTP. Please request a new one.' });
    }

    // OTP is valid — now create the user account
    // Step 1: Create user record
    const userId = randomUUID();
    const newUser = {
      id: userId,
      name: name || email?.split('@')[0] || 'User',
      email: email || '',
      emailVerified: true, // Verified via OTP
      role: role || 'candidate',
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(user).values(newUser);
    console.log(`[otp.verify-public] User created: ${userId} (role: ${role})`);

    // Step 2: Create role-specific profile
    if (role === 'candidate') {
      // Sanitize phone for candidate profile
      const sanitizedPhone = phone
        ? phone.replace(/\s/g, '').replace(/^(\+91)?/, '')
        : '';

      await db.insert(candidateProfile).values({
        userId,
        phone: sanitizedPhone,
        mobileVerified: !!phone,
      });
      console.log(`[otp.verify-public] Candidate profile created for ${userId}`);
    } else if (role === 'consultant') {
      await db.insert(consultantProfile).values({
        userId,
      });
      console.log(`[otp.verify-public] Consultant profile created for ${userId}`);
    } else if (role === 'employer') {
      await db.insert(employerProfile).values({
        userId,
      });
      console.log(`[otp.verify-public] Employer profile created for ${userId}`);
    }

    // Step 3: Create session token
    const sessionId = randomUUID();
    const sessionToken = randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.insert(session).values({
      id: sessionId,
      userId,
      token: sessionToken,
      expiresAt: sessionExpiresAt,
    });
    console.log(`[otp.verify-public] Session created for ${userId}`);

    // Step 4: Set session cookie (HttpOnly, SameSite=Lax)
    res.cookie('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    // Step 5: Delete OTP record (mark as used)
    await db.delete(otpStore).where(eq(otpStore.id, rows[0].id));

    console.log(`[otp.verify-public] OTP verified and deleted for identifier: ${identifier}`);

    // Step 6: Return response with user data and role
    res.json({
      success: true,
      verified: true,
      user: {
        id: userId,
        email,
        name: newUser.name,
        role,
      },
      role,
    });
  } catch (err) {
    console.error('[otp.verify-public] ERROR:', err);
    res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
  }
}
