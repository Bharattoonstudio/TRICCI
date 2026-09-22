// src/api/auth/verify-otp/POST.ts
// Verify OTP code
// Body: { userId, otp, type } (type: 'signup' or 'password_reset')
// Returns: { success, message }

import { createClient } from '@supabase/supabase-js';
import { getClientIP, getUserAgent } from '@/lib/auth-utils';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, otp, type } = req.body;

  try {
    // ====== VALIDATION ======
    if (!userId || !otp || !type) {
      return res.status(400).json({
        error: 'Missing required fields: userId, otp, type',
      });
    }

    if (!['signup', 'password_reset'].includes(type)) {
      return res.status(400).json({
        error: 'type must be: signup or password_reset',
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({
        error: 'OTP must be a 6-digit number',
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

    // ====== FETCH OTP RECORD ======
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('otp_type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      await supabase.from('auth_audit_log').insert({
        user_id: userId,
        event_type: `otp_verification_${type}`,
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'No OTP found' },
      });

      return res.status(404).json({
        error: 'No OTP request found. Please request a new code.',
      });
    }

    // ====== CHECK OTP EXPIRY ======
    const expiresAt = new Date(otpRecord.expires_at);
    if (new Date() > expiresAt) {
      await supabase.from('auth_audit_log').insert({
        user_id: userId,
        event_type: `otp_verification_${type}`,
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'OTP expired' },
      });

      return res.status(400).json({
        error: 'OTP has expired. Please request a new code.',
      });
    }

    // ====== VERIFY OTP CODE ======
    if (otpRecord.otp_code !== otp) {
      await supabase.from('auth_audit_log').insert({
        user_id: userId,
        event_type: `otp_verification_${type}`,
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'Invalid OTP code' },
      });

      return res.status(400).json({
        error: 'Incorrect OTP. Please try again.',
      });
    }

    // ====== MARK OTP AS VERIFIED ======
    await supabase
      .from('otp_verifications')
      .update({
        email_verified: true,
        mobile_verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('id', otpRecord.id);

    // ====== HANDLE TYPE-SPECIFIC VERIFICATION ======
    if (type === 'signup') {
      // Mark email as verified for signup
      await supabase
        .from('users')
        .update({
          email_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

    // ====== AUDIT LOG ======
    await supabase.from('auth_audit_log').insert({
      user_id: userId,
      event_type: `otp_verification_${type}`,
      event_status: 'success',
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: { otpType: type },
    });

    // ====== RESPONSE ======
    return res.status(200).json({
      success: true,
      message: `OTP verified successfully for ${type}.`,
      verified: true,
      nextStep: type === 'signup' ? 'login' : 'password-reset',
    });
  } catch (error: any) {
    console.error('OTP verification error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
