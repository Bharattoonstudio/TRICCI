// src/api/auth/signup/POST.ts
// User signup endpoint - OTP-based
// Body: { email, name, role }
// Returns: { success, userId, message }

import { createClient } from '@supabase/supabase-js';
import { generateOTP, getClientIP, getUserAgent } from '@/lib/auth-utils';
import { sendOTPEmail, sendOTPSMS } from '@/lib/brevo-service';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, role } = req.body;

  try {
    // ====== VALIDATION ======
    if (!email || !name || !role) {
      return res.status(400).json({
        error: 'Missing required fields: email, name, role',
      });
    }

    if (!['employer', 'consultant', 'candidate'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be: employer, consultant, or candidate',
      });
    }

    const emailLower = email.toLowerCase();

    // ====== CHECK IF USER EXISTS ======
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailLower)
      .single();

    if (!checkError && existingUser) {
      return res.status(409).json({
        error: 'An account with this email already exists. Please sign in.',
      });
    }

    // ====== CREATE USER (NOT YET VERIFIED) ======
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: emailLower,
        name,
        role,
        is_active: true,
        email_verified: false,
        mobile_verified: false,
        // Password is not set during signup - only OTP verification
        password_hash: null,
      })
      .select('id')
      .single();

    if (createError || !newUser) {
      console.error('User creation error:', createError);
      return res.status(500).json({
        error: 'Failed to create account. Please try again.',
      });
    }

    // ====== GENERATE OTP ======
    const otp = generateOTP();

    // ====== STORE OTP VERIFICATION RECORD ======
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        user_id: newUser.id,
        otp_code: otp,
        otp_type: 'signup',
      })
      .select('id')
      .single();

    if (otpError || !otpRecord) {
      console.error('OTP creation error:', otpError);
      // Clean up user if OTP creation fails
      await supabase.from('users').delete().eq('id', newUser.id);
      return res.status(500).json({
        error: 'Failed to process signup. Please try again.',
      });
    }

    // ====== SEND OTP VIA EMAIL & SMS (PARALLEL) ======
    const [emailResult, smsResult] = await Promise.all([
      sendOTPEmail(emailLower, otp, name),
      // For SMS, we'd need the mobile number which we don't have yet at signup
      // So we'll just send email for now
      Promise.resolve({ success: true }),
    ]);

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      return res.status(500).json({
        error: 'Failed to send verification email. Please try again.',
      });
    }

    // ====== UPDATE OTP RECORD ======
    await supabase
      .from('otp_verifications')
      .update({
        email_sent: emailResult.success,
        email_sent_at: emailResult.success ? new Date().toISOString() : null,
      })
      .eq('id', otpRecord.id);

    // ====== AUDIT LOG ======
    await supabase.from('auth_audit_log').insert({
      user_id: newUser.id,
      event_type: 'signup',
      event_status: 'success',
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: { role, email: emailLower },
    });

    // ====== RESPONSE ======
    return res.status(201).json({
      success: true,
      userId: newUser.id,
      message: `Account created! Check your email for a 6-digit verification code.`,
      requiresOTPVerification: true,
      nextStep: 'verify-signup-otp',
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
