/**
 * POST /api/otp/login/send
 * Public endpoint — no session required.
 * Used during login to send OTP to existing user's email.
 *
 * Body: { email: string }
 * Rate-limited: 5 OTPs per identifier per 10 minutes (via auth-rate-limit.ts).
 * OTP is delivered to email inbox.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { otpStore, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/server/email.js';
import { randomInt } from 'crypto';

const hasSmsKey = !!process.env.FAST2SMS_API_KEY;

export default async function otp_login_send_post(req: Request, res: Response) {
	try {
		// Validate request body
		const { email } = req.body as { email?: string };

		if (!email) {
			return res.status(400).json({ error: 'Email is required' });
		}

		// Validate email
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({ error: 'Invalid email address' });
		}

		// Check if user exists (login flow only works for existing users)
		const existingUser = await db.query.user.findFirst({
			where: (fields, { eq }) => eq(fields.email, email),
		});

		if (!existingUser) {
			return res.status(404).json({ error: 'User not found. Please sign up first.' });
		}

		// Generate OTP
		const otp = randomInt(100000, 999999).toString();

		// identifier must match exactly what verify endpoint expects
		const identifier = `email:${email.toLowerCase().trim()}`;

		// Store OTP with expiry (10 minutes)
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
		await db.insert(otpStore).values({
			identifier,
			otp,
			expiresAt,
			purpose: 'login_mobile',
			verified: false,
		});

		console.log(`[otp.login.send] OTP sent for login to ${email}`);

		// Send OTP via Email
		res.status(200).json({
			success: true,
			message: 'OTP sent to your email',
			sms: hasSmsKey,
		});

		// Email run after the response — fire-and-forget
		sendEmail({
			to: email,
			subject: 'Your TRICCI Login Code',
			html: `
				<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
					<h2>Login Code</h2>
					<p>Your OTP to log in to TRICCI:</p>
					<div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
						${otp}
					</div>
					<p style="color: #666;">This code expires in 10 minutes.</p>
					<p style="color: #999; font-size: 12px;">If you didn't request this code, you can ignore this email.</p>
				</div>
			`,
		}).catch(emailErr => {
			console.error('[otp.login.send] Email delivery FAILED:', emailErr instanceof Error ? emailErr.message : emailErr);
		});
	} catch (err) {
		console.error('[otp.login.send] ERROR:', err);
		res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
	}
}
