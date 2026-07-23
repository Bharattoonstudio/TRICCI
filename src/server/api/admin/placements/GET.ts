/**
 * GET /api/admin/placements
 * Returns all placements with optional search + pagination.
 * Admin-only.
 */
import type { Request, Response } from 'express';
import { pool } from '@/server/db/pool.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session || role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const search = String(req.query.search ?? '').trim();
    const page   = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
    const limit  = 25;
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      whereClauses.push(`(
        p.candidate_name LIKE ? OR
        p.candidate_email LIKE ? OR
        p.job_title LIKE ? OR
        p.company_name LIKE ? OR
        p.consultant_name LIKE ?
      )`);
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const [rows] = await pool.query<any[]>(
      `SELECT
        p.id,
        p.submission_id,
        p.job_id,
        p.job_title,
        p.company_name,
        p.candidate_name,
        p.candidate_email,
        p.consultant_user_id,
        p.consultant_name,
        p.employer_user_id,
        p.ctc_lpa,
        p.fee_percent,
        p.fee_amount_lpa,
        p.payment_status,
        p.placed_at,
        p.created_at
      FROM placement p
      ${where}
      ORDER BY p.placed_at DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[countRow]] = await pool.query<any[]>(
      `SELECT COUNT(*) AS total FROM placement p ${where}`,
      params
    );

    const total = Number(countRow?.total ?? 0);

    // Summary stats
    const [[statsRow]] = await pool.query<any[]>(`
      SELECT
        COUNT(*) AS total_placements,
        SUM(fee_amount_lpa) AS total_revenue_lpa,
        AVG(ctc_lpa) AS avg_ctc_lpa,
        COUNT(DISTINCT consultant_user_id) AS active_consultants
      FROM placement
    `);

    res.json({
      placements: rows,
      total,
      page,
      pages: Math.ceil(total / limit),
      stats: {
        totalPlacements: Number(statsRow?.total_placements ?? 0),
        totalRevenueLpa: Number(statsRow?.total_revenue_lpa ?? 0),
        avgCtcLpa: Number(statsRow?.avg_ctc_lpa ?? 0),
        activeConsultants: Number(statsRow?.active_consultants ?? 0),
      },
    });
  } catch (err) {
    console.error('[admin.placements.get] error:', err);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
}
