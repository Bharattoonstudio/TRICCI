// src/api/auth/forgot-password/POST.ts
// Request password reset
// Body: { email }
// Returns: { success, message, requiresOTPVerification }

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

  const { email } = req.body;

  try {
    // ====== VALIDATION ======
    if (!email) {
      return res.status(400).json({
        error: 'Missing required field: email',
      });
    }

    // ====== FETCH USER ======
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !user) {
      // Don't reveal if email exists (security best practice)
      await supabase.from('auth_audit_log').insert({
        event_type: 'password_reset_request',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'User not found', email },
      });

      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // ====== GENERATE OTP ======
    const otp = generateOTP();

    // ====== STORE OTP VERIFICATION RECORD ======
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        user_id: user.id,
        otp_code: otp,
        otp_type: 'password_reset',
      })
      .select('id')
      .single();

    if (otpError || !otpRecord) {
      console.error('OTP creation error:', otpError);
      return res.status(500).json({
        error: 'Failed to process password reset request. Please try again.',
      });
    }

    // ====== SEND OTP VIA EMAIL & SMS (PARALLEL) ======
    const [emailResult, smsResult] = await Promise.all([
      sendOTPEmail(user.email, otp, user.name),
      sendOTPSMS(user.mobile, otp),
    ]);

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      return res.status(500).json({
        error: 'Failed to send password reset email. Please try again.',
      });
    }

    // ====== UPDATE OTP RECORD ======
    await supabase
      .from('otp_verifications')
      .update({
        email_sent: emailResult.success,
        email_sent_at: emailResult.success ? new Date().toISOString() : null,
        mobile_sent: smsResult.success,
        mobile_sent_at: smsResult.success ? new Date().toISOString() : null,
      })
      .eq('id', otpRecord.id);

    // ====== AUDIT LOG ======
    await supabase.from('auth_audit_log').insert({
      user_id: user.id,
      event_type: 'password_reset_request',
      event_status: 'success',
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: { sms_delivery: smsResult.success },
    });

    // ====== RESPONSE ======
    return res.status(200).json({
      success: true,
      message: `Password reset OTP sent to ${user.email} and ${user.mobile}. Valid for 15 minutes.`,
      requiresOTPVerification: true,
      userId: user.id,
      nextStep: 'verify-password-reset-otp',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
