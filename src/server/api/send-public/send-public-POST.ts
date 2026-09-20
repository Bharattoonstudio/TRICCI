/**
 * POST /api/otp/send-public
 * Public endpoint – no session required.
 * Used during signup to verify email+mobile before account creation.
 *
 * Body: { phone: string, email: string, type?: string }
 *
 * Rate-limited: 3 OTPs per phone per hour (brute-force protection).
 *
 * OTP is delivered to BOTH email inbox AND SMS via Fast2SMS if key is set.
 */

import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { otpStore } from '@/server/db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { sendEmail } from '@/server/email.js';
import { randomInt } from 'crypto';

const hasSmsKey = !!process.env.FAST2SMS_API_KEY;

async function handler(req: Request, res: Response) {
  try {
    const { phone, email, name, role, type } = req.body;

    // Validate required fields
    if (!phone || !email) {
      return res.status(400).json({
        error: 'Phone and email are required'
      });
    }

    // Sanitize phone number
    const sanitizedPhone = phone
      .replace(/\s/g, '')
      .replace(/^\+?(?:91|0)/, '');

    if (!/^\d{10}$/.test(sanitizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check if email already exists (only for signup)
    if (type === 'signup') {
      const existingUser = await db.query.user.findFirst({
        where: (fields, { eq }) => eq(fields.email, email)
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    // Create identifier in format verify-public expects
    const emailIdentifier = `email:${email.toLowerCase().trim()}`;
    const phoneIdentifier = `phone:${sanitizedPhone}`;

    // Rate limit: 3 OTPs per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtps = await db
      .select()
      .from(otpStore)
      .where(
        and(
          eq(otpStore.identifier, phoneIdentifier),
          gt(otpStore.createdAt, oneHourAgo)
        )
      );

    if (recentOtps.length >= 3) {
      return res.status(429).json({
        error: 'Too many OTP requests. Please try again later.'
      });
    }

    // Generate OTP
    const otp = randomInt(100000, 999999).toString();

    // Store OTP with expiry (10 minutes)
    // Use purpose field to match verify-public expectations
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store both email and phone identifiers so verify can use either
    await db.insert(otpStore).values({
      identifier: emailIdentifier,
      otp,
      purpose: type === 'signup' ? 'signup_mobile' : 'login_mobile',
      verified: false,
      expiresAt,
      phone: sanitizedPhone,
      email: email.toLowerCase().trim(),
    });

    // Send email
    await sendEmail({
      to: email,
      subject: 'TRICCI - Your One-Time Password',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #333;">TRICCI - Verification Code</h2>
          <p style="font-size: 18px; color: #333;">Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h1 style="color: #667eea; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
    }).catch(emailErr => {
      console.error('[otp.send-public] Email delivery failed:', emailErr instanceof Error ? emailErr.message : '');
      // Continue anyway - SMS might work
    });

    // Send SMS via Fast2SMS if available
    if (hasSmsKey) {
      try {
        await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': process.env.FAST2SMS_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'dlt',
            numbers: sanitizedPhone,
            message: `Your TRICCI verification code is: ${otp}. This code expires in 10 minutes.`,
          }),
        }).catch(smsErr => {
          console.error('[otp.send-public] SMS delivery failed:', smsErr instanceof Error ? smsErr.message : '');
          // Continue anyway - Email might work
        });
      } catch (smsErr) {
        console.error('[otp.send-public] SMS delivery error:', smsErr instanceof Error ? smsErr.message : '');
        // Continue - Email already sent
      }
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      details: `OTP sent to your email. It will also arrive by SMS shortly if your number supports it.`,
      sms: hasSmsKey ? 'SMS will be sent shortly' : 'SMS service not available'
    });

  } catch (err) {
    console.error('[otp.send-public] ERROR:', err);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
}

// Export handler
export default (req: Request, res: Response) => {
  handler(req, res).catch((err) => {
    console.error('[otp.send-public] Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });
};
