/**
 * POST /api/admin/purge-mock-jobs
 * One-time endpoint to delete seeded mock jobs from the database.
 * Admin-only. Safe to call multiple times (idempotent).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { job } from '@/server/db/schema.js';
import { inArray } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

const MOCK_JOB_IDS = [
  'senior-product-manager-mumbai',
  'engineering-manager-bengaluru',
  'senior-data-scientist-bengaluru',
  'vp-sales-enterprise-delhi',
  'head-of-marketing-mumbai',
  'finance-controller-pune',
];

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session || role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    await db.delete(job).where(inArray(job.id, MOCK_JOB_IDS));

    res.json({ ok: true, message: `Mock jobs purged successfully.` });
  } catch (err) {
    console.error('[purge-mock-jobs] error:', err);
    res.status(500).json({ error: 'Failed to purge mock jobs', detail: String(err) });
  }
}
