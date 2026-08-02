/**
 * GET /api/stats/live
 * Points 78-79: homepage live counters — employers connected, consultants
 * tied up, candidate database size. Public endpoint (no auth), queries
 * directly with no caching layer so counts reflect signups immediately.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { user } from '@/server/db/schema.js';
import { sql } from 'drizzle-orm';

export default async function handler(_req: Request, res: Response) {
  try {
    const [row] = await db
      .select({
        employers: sql<number>`count(*) filter (where ${user.role} = 'employer')::int`,
        consultants: sql<number>`count(*) filter (where ${user.role} = 'consultant')::int`,
        candidates: sql<number>`count(*) filter (where ${user.role} = 'candidate')::int`,
      })
      .from(user);

    res.set('Cache-Control', 'no-store');
    res.json({
      employersConnected: row?.employers ?? 0,
      consultantsTiedUp: row?.consultants ?? 0,
      candidateDatabaseSize: row?.candidates ?? 0,
    });
  } catch (err) {
    console.error('[stats.live] ERROR:', err);
    res.status(500).json({ error: 'Failed to fetch live stats' });
  }
}
