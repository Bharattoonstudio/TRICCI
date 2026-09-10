/**
 * POST /api/otp/send-public
 * Public endpoint — no session required.
 * Used during signup to verify email+mobile before account creation.
 *
 * Body: { phone: string, email: string, purpose?: string }
 * Rate-limited: 3 OTPs per phone per hour (brute-force protection via auth-rate-limit.ts).
 * OTP is delivered to BOTH email inbox AND SMS (via Fast2SMS if key is set).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { otpStore } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/server/email.js';
import { randomInt } from 'crypto';

const hasSmsKey = !!process.env.FAST2SMS_API_KEY;

async function sendSmsOtp(phone: string, otp: string) {
	if (!hasSmsKey) return;

	try {
		const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
			method: 'POST',
			headers: {
				'authorization': process.env.FAST2SMS_API_KEY || '',
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				variables_values: otp,
				route: 'otp',
				numbers: phone,
			}).toString(),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`Fast2SMS error: ${error}`);
		}

		console.log(`[otp.send-public] SMS sent to +91${phone}`);
	} catch (err) {
		throw err;
	}
}

export default async function otp_send_public_post_53(req: Request, res: Response) {
	try {
		// Validate request body
		const { phone, email, purpose } = req.body as { phone?: string; email?: string; purpose?: string };

		if (!phone || !email) {
			return res.status(400).json({ error: 'Phone and email are required' });
		}

		// Sanitize phone number
		const sanitizedPhone = phone
			.replace(/\s/g, '')
			.replace(/^(\+91)?/, '');

		if (!/^\d{10}$/.test(sanitizedPhone)) {
			return res.status(400).json({ error: 'Invalid phone number' });
		}

		// Validate email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({ error: 'Invalid email address' });
		}

		// Check if email already exists (only in production)
		if (purpose === 'signup') {
			const existingUser = await db.query.user.findFirst({
				where: (fields, { eq }) => eq(fields.email, email),
			});

			if (existingUser) {
				return res.status(400).json({ error: 'Email already registered' });
			}
		}

		// Generate OTP
		const otp = randomInt(100000, 999999).toString();

		// identifier must match exactly what verify-public expects: email:xxx or phone:xxx
		const identifier = `email:${email.toLowerCase().trim()}`;

		// Store OTP with expiry (10 minutes)
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
		await db.insert(otpStore).values({
			identifier,
			otp,
			expiresAt,
			purpose: purpose || 'signup',
			verified: false,
		});

		// Send OTP via Email
		res.status(200).json({
			success: true,
			message: hasSmsKey
				? 'OTP sent to your email. It will also arrive by SMS shortly if your number supports it.'
				: 'OTP sent to your email',
			sms: hasSmsKey,
		});

		// Email + SMS run after the response — fire-and-forget, but logged
		// loudly so real failures show up clearly in Railway logs. Doing
		// this BEFORE responding (the previous behaviour) meant every
		// signup waited on Brevo's full round-trip before the user even
		// saw "OTP sent" — that's the actual cause of the OTP feeling slow,
		// not delivery itself.
		sendEmail({
			to: email,
			subject: 'Your TRICCI Verification Code',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2>Verification Code</h2>
					<p>Your OTP to sign up or verify your account:</p>
					<div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
						${otp}
					</div>
					<p style="color: #666;">This code expires in 10 minutes.</p>
					<p style="color: #999; font-size: 12px;">If you didn't request this code, you can ignore this email.</p>
				</div>
			`,
		}).catch(emailErr => {
			console.error('[otp.send-public] Email delivery FAILED:', emailErr instanceof Error ? emailErr.message : emailErr);
		});

		if (hasSmsKey) {
			sendSmsOtp(sanitizedPhone, otp).catch(err => {
				console.error(`[otp.send-public] SMS delivery FAILED for +91${sanitizedPhone}:`, err instanceof Error ? err.message : err);
			});
		}
	} catch (err) {
		console.error('[otp.send-public] ERROR:', err);
		res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
	}
}
