// src/api/auth/signup-secure/POST.ts
// New secure signup endpoint
// Body: { name, mobile, email, password, role }
// Returns: { success, userId, message }

import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcryptjs';
import axios from 'axios';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BREVO_API_KEY = process.env.BREVO_API_KEY!;
const BREVO_API_URL = 'https://api.brevo.com/v3';

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

async function sendWelcomeEmail(email: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(
      `${BREVO_API_URL}/smtp/email`,
      {
        to: [{ email, name }],
        from: { email: 'noreply@tricci.in', name: 'TRICCI' },
        subject: `Welcome to TRICCI, ${name}!`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to TRICCI!</h2>
            <p>Hi ${name},</p>
            <p>Your account has been successfully created. You can now log in with your email and password.</p>
            <p>
              <a href="https://tricci.in/login-fresh" style="background-color: #E8470A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Login
              </a>
            </p>
            <p>If you have any questions, feel free to reach out to us.</p>
            <p>Best regards,<br/>The TRICCI Team</p>
          </div>
        `,
      },
      {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return { success: true };
  } catch (error: any) {
    console.error('Brevo email error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, mobile, email, password, role = 'candidate' } = req.body;

  try {
    // ====== VALIDATION ======
    if (!name || !email || !password || !mobile) {
      return res.status(400).json({
        error: 'Missing required fields: name, email, password, mobile',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
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

    // ====== HASH PASSWORD ======
    const hashedPassword = await bcrypt.hash(password, 10);

    // ====== CREATE USER ======
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        name,
        email: emailLower,
        mobile,
        password_hash: hashedPassword,
        role,
        is_active: true,
        email_verified: false,
      })
      .select('id, name, email, role')
      .single();

    if (createError || !newUser) {
      console.error('User creation error:', createError);
      return res.status(500).json({
        error: 'Failed to create account. Please try again.',
      });
    }

    // ====== SEND WELCOME EMAIL ======
    const emailResult = await sendWelcomeEmail(emailLower, name);

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      // Still return success but log the email failure
    }

    // ====== AUDIT LOG ======
    await supabase.from('auth_audit_log').insert({
      user_id: newUser.id,
      event_type: 'signup',
      event_status: 'success',
      ip_address: getClientIP(req),
      user_agent: getUserAgent(req),
      details: { role, email: emailLower, mobile },
    });

    // ====== RESPONSE ======
    return res.status(201).json({
      success: true,
      userId: newUser.id,
      user: newUser,
      message: 'Account created successfully! You can now log in with your email and password.',
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
