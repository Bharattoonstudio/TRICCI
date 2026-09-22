// src/api/auth/resend-otp/POST.ts
// Resend OTP
// Body: { userId, otpType } (otpType: 'signup' or 'password_reset')
// Returns: { success, message }

import { createClient } from '@supabase/supabase-js';
import { generateOTP, getClientIP, getUserAgent } from '@/lib/auth-utils';
import { sendOTPEmail, sendOTPSMS } from '@/lib/brevo-service';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limit: max 5 OTP requests per hour per user
const MAX_OTP_REQUESTS_PER_HOUR = 5;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, otpType } = req.body;

  try {
    // ====== VALIDATION ======
    if (!userId || !otpType) {
      return res.status(400).json({
        error: 'Missing required fields: userId, otpType',
      });
    }

    if (!['signup', 'password_reset'].includes(otpType)) {
      return res.status(400).json({
        error: 'otpType must be: signup or password_reset',
      });
    }

    // ====== FETCH USER ======
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // ====== CHECK RATE LIMIT ======
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentRequests, error: countError } = await supabase
      .from('otp_verifications')
      .select('id')
      .eq('user_id', userId)
      .eq('otp_type', otpType)
      .gt('created_at', oneHourAgo);

    if (!countError && recentRequests && recentRequests.length >= MAX_OTP_REQUESTS_PER_HOUR) {
      await supabase.from('auth_audit_log').insert({
        user_id: userId,
        event_type: 'otp_request',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'Rate limit exceeded' },
      });

      return res.status(429).json({
        error: 'Too many OTP requests. Please try again after 1 hour.',
        retryAfter: 3600,
      });
    }

    // ====== INVALIDATE OLD OTP RECORDS ======
    await supabase
      .from('otp_verifications')
      .delete()
      .eq('user_id', userId)
      .eq('otp_type', otpType);

    // ====== GENERATE NEW OTP ======
    const otp = generateOTP();

    // ====== STORE NEW OTP RECORD ======
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .insert({
        user_id: userId,
        otp_code: otp,
        otp_type: otpType,
      })
      .select('id')
      .single();

    if (otpError || !otpRecord) {
      console.error('OTP creation error:', otpError);
      return res.status(500).json({
        error: 'Failed to generate OTP. Please try again.',
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
        error: 'Failed to send OTP email. Please try again.',
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
      user_id: userId,
      event_type: 'otp_request',
      event_status: 'success',
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: { otpType, sms_delivery: smsResult.success },
    });

    // ====== RESPONSE ======
    return res.status(200).json({
      success: true,
      message: `OTP resent to ${user.email} and ${user.mobile}. Valid for 6 minutes.`,
      retryAfter: 60, // Can retry after 1 minute
    });
  } catch (error: any) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
