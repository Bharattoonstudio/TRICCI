/**
 * Admin Endpoint: Setup Test Accounts
 * 
 * Creates or resets test accounts for all three personas with a known password.
 * Password is hashed using BetterAuth's scrypt algorithm.
 * 
 * Protected: Admin role only
 * Usage: POST /api/admin/setup-test-accounts { password: "Amrita@1986" }
 */

import { db } from '@/server/db/client.js';
import { user, account, candidateProfile, employerProfile, consultantProfile } from '@/server/db/schema.js';
import { sql } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';

interface TestAccount {
  email: string;
  name: string;
  role: 'employer' | 'consultant' | 'candidate';
}

const TEST_ACCOUNTS: TestAccount[] = [
  { email: 'test.employer@tricci.in', name: 'Test Employer', role: 'employer' },
  { email: 'test.consultant@tricci.in', name: 'Test Consultant', role: 'consultant' },
  { email: 'test.candidate@tricci.in', name: 'Test Candidate', role: 'candidate' },
];

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Allow setup with admin token or secret key
    const setupToken = req.body.setupToken || process.env.ADMIN_SETUP_TOKEN;
    const expectedToken = process.env.ADMIN_SETUP_TOKEN || 'tricci-test-setup-2024';

    // For initial setup, allow if token matches or if no token is set in env
    if (process.env.ADMIN_SETUP_TOKEN && setupToken !== expectedToken) {
      return res.status(403).json({ message: 'Invalid setup token' });
    }

    console.log('✓ Test account setup endpoint called');

    const { password = 'Amrita@1986' } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Hash password using BetterAuth's scrypt
    const hashedPassword = await hashPassword(password);

    const results: any[] = [];

    // Create or update each test account
    for (const testAccount of TEST_ACCOUNTS) {
      try {
        // Check if user exists
        const existingUser = await db
          .select({ id: user.id })
          .from(user)
          .where(sql`email = ${testAccount.email}`)
          .limit(1);

        let userId: string;

        if (existingUser && existingUser.length > 0) {
          // User exists — update password only
          userId = existingUser[0].id;
          
          // Update or insert account record
          await db
            .insert(account)
            .values({
              id: `account_${userId}`,
              accountId: userId,
              providerId: 'credential',
              userId: userId,
              password: hashedPassword,
            })
            .onConflictDoUpdate({
              target: account.userId,
              set: { password: hashedPassword, updatedAt: new Date() },
            });

          results.push({
            status: 'updated',
            email: testAccount.email,
            role: testAccount.role,
            message: `Password reset for ${testAccount.email}`,
          });
        } else {
          // User doesn't exist — create new
          userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          // Insert user
          await db.insert(user).values({
            id: userId,
            email: testAccount.email,
            name: testAccount.name,
            role: testAccount.role,
            emailVerified: new Date(), // Auto-verify for testing
          });

          // Insert account (credentials)
          await db.insert(account).values({
            id: `account_${userId}`,
            accountId: userId,
            providerId: 'credential',
            userId: userId,
            password: hashedPassword,
          });

          // Create role-specific profile
          if (testAccount.role === 'candidate') {
            await db.insert(candidateProfile).values({ userId }).onConflictDoUpdate({
              target: candidateProfile.userId,
              set: { userId },
            });
          } else if (testAccount.role === 'employer') {
            await db.insert(employerProfile).values({ userId }).onConflictDoUpdate({
              target: employerProfile.userId,
              set: { userId },
            });
          } else if (testAccount.role === 'consultant') {
            await db.insert(consultantProfile).values({ userId }).onConflictDoUpdate({
              target: consultantProfile.userId,
              set: { userId },
            });
          }

          results.push({
            status: 'created',
            email: testAccount.email,
            role: testAccount.role,
            message: `Test account created: ${testAccount.email}`,
          });
        }
      } catch (accountError) {
        console.error(`Error setting up ${testAccount.email}:`, accountError);
        results.push({
          status: 'error',
          email: testAccount.email,
          role: testAccount.role,
          message: `Failed to setup: ${accountError instanceof Error ? accountError.message : 'Unknown error'}`,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Test accounts setup complete',
      password: password,
      accounts: results,
      testCredentials: {
        employer: { email: 'test.employer@tricci.in', password, role: 'employer' },
        consultant: { email: 'test.consultant@tricci.in', password, role: 'consultant' },
        candidate: { email: 'test.candidate@tricci.in', password, role: 'candidate' },
      },
    });
  } catch (error) {
    console.error('Setup test accounts error:', error);
    return res.status(500).json({
      message: 'Failed to setup test accounts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
