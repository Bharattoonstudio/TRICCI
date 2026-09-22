// src/api/auth/login-secure/POST.ts
// Secure login endpoint with password verification
// Body: { email, password }
// Returns: { success, token, user, redirectUrl }

import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Utility functions
function getClientIP(req: any): string {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function getUserAgent(req: any): string {
  return req.headers['user-agent'] || 'unknown';
}

function getRedirectUrl(role: string): string {
  const redirectMap: Record<string, string> = {
    employer: '/employer/dashboard',
    consultant: '/consultant/dashboard',
    candidate: '/candidate/profile',
    admin: '/admin',
  };
  return redirectMap[role] || '/candidate/profile';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  try {
    // ====== VALIDATION ======
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    const emailLower = email.toLowerCase();

    // ====== FETCH USER ======
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, role, password_hash, is_active')
      .eq('email', emailLower)
      .single();

    if (fetchError || !user) {
      // Generic error for security (don't reveal if email exists)
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // ====== CHECK IF ACCOUNT IS ACTIVE ======
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Your account has been deactivated. Contact support.',
      });
    }

    // ====== VERIFY PASSWORD ======
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Log failed login attempt
      await supabase.from('auth_audit_log').insert({
        user_id: user.id,
        event_type: 'login',
        event_status: 'failed',
        ip_address: getClientIP(req),
        user_agent: getUserAgent(req),
        details: { reason: 'invalid_password' },
      });

      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // ====== GENERATE JWT TOKEN ======
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // ====== LOG SUCCESSFUL LOGIN ======
    await supabase.from('auth_audit_log').insert({
      user_id: user.id,
      event_type: 'login',
      event_status: 'success',
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: { role: user.role },
    });

    // ====== UPDATE LAST LOGIN ======
    await supabase
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // ====== RESPONSE ======
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      redirectUrl: getRedirectUrl(user.role),
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
