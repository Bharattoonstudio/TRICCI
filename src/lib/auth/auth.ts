/**
 * BetterAuth Server Configuration
 *
 * Supports both Email/Password and OAuth authentication.
 * Enable/disable methods by uncommenting the relevant sections.
 *
 * Secrets (via environment variables — set these in Railway):
 * - BETTER_AUTH_SECRET: Session encryption key
 * - OAuth credentials (GOOGLE_CLIENT_ID, etc.) for social login
 *
 * CORS/Trusted Origins:
 * - Only trusts origins matching the server's hostname
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from '@/server/db/client';
import { user, session, account, verification, candidateProfile, employerProfile, consultantProfile } from '@/server/db/schema';
import { sendEmail } from '@/server/email';

// Lazy singleton — betterAuth() must NOT run at module init time.
//
// The BETTER_AUTH_SECRET is loaded from environment variables at runtime, so
// the auth instance must be constructed after they're available (i.e. on
// the first HTTP request, not at import time).
//
// Pattern mirrors how db/client.ts defers the actual Postgres connection —
// the pool object is safe to create at init, but anything that reads schema
// state or secrets must be deferred to request time.
let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth() {
  if (_auth) return _auth;

  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (!authSecret || typeof authSecret !== 'string') {
    throw new Error('BETTER_AUTH_SECRET is not set. Add it to your environment variables.');
  }

  if (!db) {
    throw new Error('Database not configured. Set DATABASE_URL first, then configure auth.');
  }

  const auth = betterAuth({
    // Explicit base URL so BetterAuth can build verification/reset links correctly.
    baseURL: process.env.BETTER_AUTH_URL || 'https://tricci.in',

    // Schema passed explicitly — avoids BetterAuth's runtime schema inference.
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification },
    }),

    secret: authSecret,

    // Protect admin status field from user input
    user: {
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'candidate',
          input: true,
          returned: true,
        },
        isAdmin: {
          type: 'boolean',
          defaultValue: false,
          input: false,
          returned: true,
        },
      },
    },

    // Auto-create role-specific profile row when a new user is created
    databaseHooks: {
      user: {
        create: {
          after: async (newUser) => {
            try {
              const role = (newUser as { role?: string }).role ?? 'candidate';
              if (role === 'candidate') {
                await db.insert(candidateProfile).values({ userId: newUser.id })
                  .onConflictDoUpdate({ target: candidateProfile.userId, set: { userId: newUser.id } });
              } else if (role === 'employer') {
                await db.insert(employerProfile).values({ userId: newUser.id })
                  .onConflictDoUpdate({ target: employerProfile.userId, set: { userId: newUser.id } });
              } else if (role === 'consultant') {
                await db.insert(consultantProfile).values({ userId: newUser.id })
                  .onConflictDoUpdate({ target: consultantProfile.userId, set: { userId: newUser.id } });
                // Send welcome email (non-blocking — don't fail signup if email fails)
                import('@/server/emails/consultant-onboarding.js')
                  .then(m => m.sendConsultantWelcomeEmail(newUser.email, newUser.name))
                  .catch(err => console.error('consultant.welcome_email.error', err));
              }
            } catch (err) {
              // Non-fatal — profile can be created later on first login
              console.error('profile.autocreate.error', err);
            }
          },
        },
      },
    },

    // CORS: Trusts localhost and the custom domain.
    trustedOrigins: (request?: Request) => {
      if (!request) return [];

      const origin = request.headers.get('origin');
      if (!origin) return [];

      try {
        const originUrl = new URL(origin);
        const hostname = originUrl.hostname;

        // Trust localhost for development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return [origin];
        }

        // Trust the custom domain and any www subdomain
        if (hostname === 'tricci.in' || hostname === 'www.tricci.in') {
          return [origin];
        }

        return [];
      } catch {
        return [];
      }
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,   // ← disabled: mobile OTP at signup is the verification gate
      sendResetPassword: async ({ user: u, url }) => {
        await sendEmail({
          to: u.email,
          subject: 'Reset your TRICCI password',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1A0A00;color:#F5F5F5;border-radius:12px;">
              <h1 style="color:#FF6B35;font-size:24px;margin:0 0 8px;">Reset your password</h1>
              <p style="color:#aaa;margin:0 0 24px;">Hi ${u.name}, click the button below to set a new password for your TRICCI account.</p>
              <a href="${url}" style="display:inline-block;background:#FF6B35;color:#fff;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;">Reset Password</a>
              <p style="color:#666;font-size:12px;margin-top:24px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
          text: `Reset your TRICCI password: ${url}`,
        });
      },
    },


    socialProviders: {
      ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      } : {}),
      ...(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET ? {
        linkedin: {
          clientId: process.env.LINKEDIN_CLIENT_ID,
          clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        },
      } : {}),
    },
  });

  _auth = auth as unknown as ReturnType<typeof betterAuth>;
  return auth;
}

export type Session = ReturnType<typeof getAuth>['$Infer']['Session'];
export type User = ReturnType<typeof getAuth>['$Infer']['Session']['user'];
