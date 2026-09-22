// src/api/auth/reset-password/POST.ts
// Reset password with OTP
// Body: { userId, otp, newPassword }
// Returns: { success, message }

import { createClient } from '@supabase/supabase-js';
import { hashPassword, validatePasswordStrength, getClientIP, getUserAgent } from '@/lib/auth-utils';
import { sendPasswordResetConfirmationEmail } from '@/lib/brevo-service';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, otp, newPassword } = req.body;

  try {
    // ====== VALIDATION ======
    if (!userId || !otp || !newPassword) {
      return res.status(400).json({
        error: 'Missing required fields: userId, otp, newPassword',
      });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({
        error: 'OTP must be a 6-digit number',
      });
    }

    // ====== VALIDATE PASSWORD STRENGTH ======
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors,
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
      .eq('otp_type', 'password_reset')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      await supabase.from('auth_audit_log').insert({
        user_id: userId,
        event_type: 'password_reset',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'No OTP found' },
      });

      return res.status(404).json({
        error: 'No password reset request found. Please request a new one.',
      });
    }

    // ====== CHECK OTP EXPIRY ======
    const expiresAt = new Date(otpRecord.expires_at);
    if (new Date() > expiresAt) {
      await supabase.from('auth_audit_log').insert({
        user_id: userId,
        event_type: 'password_reset',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'OTP expired' },
      });

      return res.status(400).json({
        error: 'OTP has expired. Please request a new password reset.',
      });
    }

    // ====== VERIFY OTP CODE ======
    if (otpRecord.otp_code !== otp) {
      await supabase.from('auth_audit_log').insert({
        user_id: userId,
        event_type: 'password_reset',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'Invalid OTP code' },
      });

      return res.status(400).json({
        error: 'Incorrect OTP. Please try again.',
      });
    }

    // ====== HASH NEW PASSWORD ======
    const passwordHash = await hashPassword(newPassword);

    // ====== UPDATE USER PASSWORD ======
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Password update error:', updateError);
      return res.status(500).json({
        error: 'Failed to reset password. Please try again.',
      });
    }

    // ====== MARK OTP AS USED ======
    await supabase
      .from('otp_verifications')
      .update({ email_verified: true, mobile_verified: true })
      .eq('id', otpRecord.id);

    // ====== INVALIDATE ALL EXISTING SESSIONS ======
    await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId);

    // ====== SEND CONFIRMATION EMAIL ======
    await sendPasswordResetConfirmationEmail(user.email, user.name);

    // ====== AUDIT LOG ======
    await supabase.from('auth_audit_log').insert({
      user_id: userId,
      event_type: 'password_reset',
      event_status: 'success',
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: { sessionsInvalidated: true },
    });

    // ====== RESPONSE ======
    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
      nextStep: 'login',
    });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
