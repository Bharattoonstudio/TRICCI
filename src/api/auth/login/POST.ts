// src/api/auth/login/POST.ts
// User login endpoint
// Body: { email, password }
// Returns: { success, userId, sessionToken, user, message }

import { createClient } from '@supabase/supabase-js';
import { verifyPassword, generateSessionToken, getClientIP, getUserAgent } from '@/lib/auth-utils';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    // ====== VALIDATION ======
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: email, password',
      });
    }

    // ====== FETCH USER ======
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (fetchError || !user) {
      await supabase.from('auth_audit_log').insert({
        event_type: 'login',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'User not found', email },
      });

      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // ====== CHECK ACCOUNT STATUS ======
    if (!user.is_active) {
      await supabase.from('auth_audit_log').insert({
        user_id: user.id,
        event_type: 'login',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'Account disabled' },
      });

      return res.status(403).json({
        error: 'Your account has been disabled. Please contact support.',
      });
    }

    // ====== CHECK EMAIL VERIFICATION ======
    if (!user.email_verified) {
      await supabase.from('auth_audit_log').insert({
        user_id: user.id,
        event_type: 'login',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'Email not verified' },
      });

      return res.status(403).json({
        error: 'Please verify your email before logging in',
        requiresEmailVerification: true,
        userId: user.id,
      });
    }

    // ====== CHECK MOBILE VERIFICATION ======
    if (!user.mobile_verified) {
      await supabase.from('auth_audit_log').insert({
        user_id: user.id,
        event_type: 'login',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'Mobile not verified' },
      });

      return res.status(403).json({
        error: 'Please verify your mobile before logging in',
        requiresMobileVerification: true,
        userId: user.id,
      });
    }

    // ====== VERIFY PASSWORD ======
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      await supabase.from('auth_audit_log').insert({
        user_id: user.id,
        event_type: 'login',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'Invalid password' },
      });

      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // ====== CREATE SESSION ======
    const sessionToken = generateSessionToken();

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        token: sessionToken,
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
      })
      .select('*')
      .single();

    if (sessionError || !session) {
      console.error('Session creation error:', sessionError);
      return res.status(500).json({
        error: 'Failed to create session. Please try again.',
      });
    }

    // ====== AUDIT LOG ======
    await supabase.from('auth_audit_log').insert({
      user_id: user.id,
      event_type: 'login',
      event_status: 'success',
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: { sessionId: session.id },
    });

    // ====== RESPONSE ======
    return res.status(200).json({
      success: true,
      userId: user.id,
      sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
      },
      message: `Welcome back, ${user.name}!`,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
