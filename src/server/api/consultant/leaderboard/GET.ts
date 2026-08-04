/**
 * GET /api/consultant/leaderboard
 * "Top Consultants This Month" — extends the employer-only ranking from
 * Phase D (ConsultantPerformance) so consultants can see it too, scoped
 * to the current calendar month and computed with the same live-points
 * formula as /api/consultant/gamification. Deliberately private-to-self
 * beyond the top 10 — shows the requester their own rank without
 * exposing every other consultant's exact standing if they're not in
 * the top 10, to avoid unnecessary competitive pressure.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { submission, jobAcceptance, user } from '@/server/db/schema.js';
import { sql } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

const POINTS = { submitted: 5, shortlisted: 15, selected: 50, jobAccepted: 2 };

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    // Month-to-date submission points, per consultant
    const subRows = await db
      .select({
        consultantUserId: submission.consultantUserId,
        name: user.name,
        total: sql<number>`count(*)::int`,
        shortlisted: sql<number>`count(*) filter (where ${submission.status} in ('shortlisted','interview','selected','offered','payment_processed','payment_done'))::int`,
        selected: sql<number>`count(*) filter (where ${submission.status} in ('selected','offered','payment_processed','payment_done'))::int`,
      })
      .from(submission)
      .innerJoin(user, sql`${user.id} = ${submission.consultantUserId}`)
      .where(sql`${submission.createdAt} >= date_trunc('month', NOW())`)
      .groupBy(submission.consultantUserId, user.name);

    const jobAcceptedRows = await db
      .select({ consultantUserId: jobAcceptance.consultantUserId, count: sql<number>`count(*)::int` })
      .from(jobAcceptance)
      .where(sql`${jobAcceptance.acceptedAt} >= date_trunc('month', NOW())`)
      .groupBy(jobAcceptance.consultantUserId);
    const jobAcceptedMap = new Map(jobAcceptedRows.map(r => [r.consultantUserId, r.count]));

    const ranked = subRows
      .map(r => ({
        consultantUserId: r.consultantUserId,
        name: r.name,
        points: r.total * POINTS.submitted + r.shortlisted * POINTS.shortlisted + r.selected * POINTS.selected + (jobAcceptedMap.get(r.consultantUserId) ?? 0) * POINTS.jobAccepted,
      }))
      .sort((a, b) => b.points - a.points);

    const top10 = ranked.slice(0, 10).map((r, i) => ({ rank: i + 1, name: r.name, points: r.points, isYou: r.consultantUserId === session.user.id }));
    const myIndex = ranked.findIndex(r => r.consultantUserId === session.user.id);
    const myRank = myIndex >= 0 ? { rank: myIndex + 1, points: ranked[myIndex].points } : null;

    res.json({ top10, myRank, totalRanked: ranked.length });
  } catch (err) {
    console.error('[consultant.leaderboard] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}
