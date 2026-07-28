/**
 * GET /api/admin/assessments
 * Admin-only. Returns ALL assessments across all employers.
 * Optional query: ?status=pending|completed|expired  ?search=name
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { assessment } from '@/server/db/schema.js';
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

    const { status, search } = req.query as { status?: string; search?: string };

    let rows = await db
      .select()
      .from(assessment)
      .orderBy(desc(assessment.createdAt))
      .limit(1000);

    if (status && status !== 'all') {
      rows = rows.filter(r => r.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.candidateName.toLowerCase().includes(q) ||
        r.candidateEmail.toLowerCase().includes(q) ||
        r.jobTitle.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q),
      );
    }

    res.json({ assessments: rows, total: rows.length });
  } catch (err) {
    console.error('admin.assessments.get.error', err);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
}
