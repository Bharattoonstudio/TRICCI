/**
 * GET /api/consultant/gamification
 * Points and badges are computed LIVE from real submission/placement
 * data every time this is called — deliberately not stored as a running
 * total, so there's no risk of it drifting out of sync with what
 * actually happened. Login streak is the one thing that can't be
 * derived from anything else, so it's updated here too (idempotent —
 * calling this multiple times in one day doesn't double-count).
 *
 * Point values (a starting point, not backed by your own usage data yet —
 * easy to tune once you see real distribution across consultants):
 *   Submission: 5   Shortlist: 15   Selected/Placed: 50   Job accepted: 2
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, jobAcceptance, consultantProfile, placement } from '@/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

const POINTS = { submitted: 5, shortlisted: 15, selected: 50, jobAccepted: 2 };

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const userId = session.user.id;

    // ── Update login streak (idempotent per day) ──────────────────────────
    const today = todayStr();
    const [profile] = await db.select({ loginStreak: consultantProfile.loginStreak, lastLoginDate: consultantProfile.lastLoginDate })
      .from(consultantProfile).where(eq(consultantProfile.userId, userId)).limit(1);

    let streak = profile?.loginStreak ?? 0;
    if (profile) {
      if (profile.lastLoginDate !== today) {
        const gap = profile.lastLoginDate ? daysBetween(profile.lastLoginDate, today) : null;
        streak = gap === 1 ? streak + 1 : 1;
        await db.update(consultantProfile).set({ loginStreak: streak, lastLoginDate: today }).where(eq(consultantProfile.userId, userId));
      }
    } else {
      streak = 1;
      await db.insert(consultantProfile).values({ userId, loginStreak: 1, lastLoginDate: today }).catch(() => {});
    }

    // ── Compute points live from real data ─────────────────────────────────
    const [subCounts] = await db.select({
      total: sql<number>`count(*)::int`,
      shortlisted: sql<number>`count(*) filter (where ${submission.status} in ('shortlisted','interview','selected','offered','payment_processed','payment_done'))::int`,
      selected: sql<number>`count(*) filter (where ${submission.status} in ('selected','offered','payment_processed','payment_done'))::int`,
    }).from(submission).where(eq(submission.consultantUserId, userId));

    const [jobsAcceptedRow] = await db.select({ count: sql<number>`count(*)::int` }).from(jobAcceptance).where(eq(jobAcceptance.consultantUserId, userId));

    const totalSubmissions = subCounts?.total ?? 0;
    const shortlistedCount = subCounts?.shortlisted ?? 0;
    const selectedCount = subCounts?.selected ?? 0;
    const jobsAccepted = jobsAcceptedRow?.count ?? 0;

    const points =
      totalSubmissions * POINTS.submitted +
      shortlistedCount * POINTS.shortlisted +
      selectedCount * POINTS.selected +
      jobsAccepted * POINTS.jobAccepted;

    // ── Placements in the last 7 days, for the "Perfect Week" badge ────────
    const [recentPlacements] = await db.select({ count: sql<number>`count(*)::int` })
      .from(placement)
      .where(sql`${placement.consultantUserId} = ${userId} AND ${placement.placedAt} >= NOW() - INTERVAL '7 days'`);

    const badges = [
      { id: 'first_placement', label: 'First Placement', emoji: '🎯', unlocked: selectedCount >= 1 },
      { id: 'century', label: 'Century', emoji: '💯', unlocked: totalSubmissions >= 100 },
      { id: 'perfect_week', label: 'Perfect Week', emoji: '⚡', unlocked: (recentPlacements?.count ?? 0) >= 5 },
      { id: 'consistent', label: '7-Day Streak', emoji: '🔥', unlocked: streak >= 7 },
      { id: 'quarter_century', label: '25 Submissions', emoji: '📈', unlocked: totalSubmissions >= 25 },
    ];

    res.json({
      points,
      streak,
      breakdown: { totalSubmissions, shortlistedCount, selectedCount, jobsAccepted },
      badges,
    });
  } catch (err) {
    console.error('[consultant.gamification] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch gamification data' });
  }
}
