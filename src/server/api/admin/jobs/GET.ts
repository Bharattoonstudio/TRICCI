/**
 * GET /api/admin/jobs
 * Admin-only. Returns all job postings with employer user info.
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { job, user } from '@/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session || (session.user as { role?: string }).role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { search, status } = req.query as { search?: string; status?: string };

    const rows = await db
      .select({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        locationType: job.locationType,
        ctcLabel: job.ctcLabel,
        ctcMin: job.ctcMin,
        ctcMax: job.ctcMax,
        experience: job.experience,
        category: job.category,
        feePercent: job.feePercent,
        status: job.status,
        applicants: job.applicants,
        postedDays: job.postedDays,
        createdAt: job.createdAt,
        postedByUserId: job.postedByUserId,
        // Employer user info (may be null for legacy jobs)
        employerName: user.name,
        employerEmail: user.email,
      })
      .from(job)
      .leftJoin(user, eq(job.postedByUserId, user.id))
      .orderBy(desc(job.createdAt))
      .limit(500);

    // Apply filters in JS (simpler than dynamic drizzle query building)
    let filtered = rows;
    if (status && status !== 'all') {
      filtered = filtered.filter(r => r.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        (r.employerEmail ?? '').toLowerCase().includes(q),
      );
    }

    res.json({ jobs: filtered, total: filtered.length });
  } catch (err) {
    console.error('admin.jobs.get.error', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
}
