/**
 * POST /api/admin/seed-demo
 * Creates demo accounts for UAT. Safe to call multiple times (idempotent).
 * Must be authenticated as admin.
 *
 * Creates:
 *   employer  → demo.employer@tricci.in  / Demo@1234
 *   consultant → demo.consultant@tricci.in / Demo@1234
 *   candidate  → demo.candidate@tricci.in  / Demo@1234
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { user, account, employerProfile, consultantProfile, candidateProfile } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { randomUUID } from 'crypto';
import { hashPassword } from '@better-auth/utils/password';

const DEMO_PASSWORD = 'Demo@1234';

const DEMO_USERS = [
  {
    name: 'Demo Employer',
    email: 'demo.employer@tricci.in',
    role: 'employer' as const,
    profile: { companyName: 'TRICCI Demo Corp', industry: 'Technology', website: 'https://tricci.in' },
  },
  {
    name: 'Demo Consultant',
    email: 'demo.consultant@tricci.in',
    role: 'consultant' as const,
    profile: { specialisation: 'Technology & Product', yearsExperience: 5 },
  },
  {
    name: 'Demo Candidate',
    email: 'demo.candidate@tricci.in',
    role: 'candidate' as const,
    profile: {
      currentTitle: 'Software Engineer',
      location: 'Bengaluru',
      phone: '9999900000',
      summary: 'Demo candidate for UAT testing.',
      currentCTC: 1200000,
      expectedCTC: 1800000,
      totalExperience: 4,
      noticePeriod: 30,
      profileComplete: 80,
    },
  },
];

export default async function handler(req: Request, res: Response) {
  try {
    // Must be admin
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const hashedPw = await hashPassword(DEMO_PASSWORD);
    const results: { email: string; status: 'created' | 'already_exists' }[] = [];

    for (const demo of DEMO_USERS) {
      const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, demo.email));

      if (existing) {
        results.push({ email: demo.email, status: 'already_exists' });
        continue;
      }

      const userId = randomUUID();

      // Insert user
      await db.insert(user).values({
        id: userId,
        name: demo.name,
        email: demo.email,
        role: demo.role,
        isAdmin: false,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Insert credential
      await db.insert(account).values({
        id: randomUUID(),
        userId,
        accountId: userId,
        providerId: 'credential',
        password: hashedPw,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Insert role-specific profile
      if (demo.role === 'employer') {
        const p = demo.profile as { companyName: string; industry: string; website: string };
        await db.insert(employerProfile).values({
          userId,
          companyName: p.companyName,
          industry: p.industry,
          website: p.website,
        });
      } else if (demo.role === 'consultant') {
        const p = demo.profile as { specialisation: string; yearsExperience: number };
        await db.insert(consultantProfile).values({
          userId,
          specialisation: p.specialisation,
          yearsExperience: p.yearsExperience,
        });
      } else if (demo.role === 'candidate') {
        const p = demo.profile as {
          currentTitle: string; location: string; phone: string; summary: string;
          currentCTC: number; expectedCTC: number; totalExperience: number;
          noticePeriod: number; profileComplete: number;
        };
        await db.insert(candidateProfile).values({
          userId,
          currentTitle: p.currentTitle,
          location: p.location,
          phone: p.phone,
          summary: p.summary,
          currentCTC: p.currentCTC,
          expectedCTC: p.expectedCTC,
          totalExperience: p.totalExperience,
          noticePeriod: p.noticePeriod,
          profileComplete: p.profileComplete,
          visibility: 'consultants',
          mobileVerified: false,
        });
      }

      results.push({ email: demo.email, status: 'created' });
    }

    res.json({
      success: true,
      password: DEMO_PASSWORD,
      accounts: results,
    });
  } catch (err) {
    console.error('admin.seed-demo.error', err);
    res.status(500).json({ error: 'Failed to seed demo accounts' });
  }
}
