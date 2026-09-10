/**
 * GET /api/admin/scorecards
 * Admin-only. Returns ALL scorecards across all employers.
 * Optional query: ?recommendation=strong_yes|yes|maybe|no  ?search=name
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { scorecard } from '@/server/db/schema.js';
import { desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { recommendation, search } = req.query as { recommendation?: string; search?: string };

    let rows = await db
      .select()
      .from(scorecard)
      .orderBy(desc(scorecard.createdAt))
      .limit(1000);

    if (recommendation && recommendation !== 'all') {
      rows = rows.filter(r => r.recommendation === recommendation);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.candidateName.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q) ||
        r.jobTitle.toLowerCase().includes(q) ||
        (r.submittedBy ?? '').toLowerCase().includes(q),
      );
    }

    res.json({ scorecards: rows, total: rows.length });
  } catch (err) {
    console.error('admin.scorecards.get.error', err);
    res.status(500).json({ error: 'Failed to fetch scorecards' });
  }
}
