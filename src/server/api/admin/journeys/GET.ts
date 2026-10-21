/** GET /api/admin/journeys[?jobId=] — end-to-end job performance for the admin dashboard. */
import type { Request, Response } from 'express';
import { requireAdmin } from '@/server/lib/adminAuth.js';
import { getJourneys } from '@/server/lib/invoiceJourney.js';

export default async function handler(req: Request, res: Response) {
  try {
    if (!(await requireAdmin(req, res))) return;
    const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    res.json({ journeys: await getJourneys(jobId) });
  } catch (err) {
    console.error('[admin.journeys] ERROR:', err);
    res.status(500).json({ error: 'Failed to load job journeys' });
  }
}
