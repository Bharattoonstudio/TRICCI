/**
 * GET /api/admin/placements
 * Returns all placements with optional search + pagination, plus fee
 * acceptance and settlement status (points 48-55). Admin-only.
 *
 * FIX: this previously used MySQL-style `?` placeholders and mysql2's
 * `[rows]` array-destructuring result format, but `pool` here is a `pg`
 * (Postgres) pool — which uses `$1, $2...` placeholders and returns
 * `{ rows }`, not `[rows]`. That mismatch meant this endpoint's queries
 * were built with syntax Postgres doesn't accept, so every request here
 * likely hit the catch block and returned a 500. Fixed to use pg's actual API.
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
      const like = `%${search}%`;
      params.push(like, like, like, like, like);
      whereClauses.push(`(
        p.candidate_name ILIKE $${params.length - 4} OR
        p.candidate_email ILIKE $${params.length - 3} OR
        p.job_title ILIKE $${params.length - 2} OR
        p.company_name ILIKE $${params.length - 1} OR
        p.consultant_name ILIKE $${params.length}
      )`);
    }

    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const listResult = await pool.query(
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
        p.consultant_fee_percent,
        p.consultant_fee_amount_lpa,
        p.fee_acceptance_status,
        p.payment_status,
        p.payment_term_days,
        p.consultant_acknowledged_at,
        p.placed_at,
        p.created_at
      FROM placement p
      ${where}
      ORDER BY p.placed_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM placement p ${where}`,
      params
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const statsResult = await pool.query(`
      SELECT
        COUNT(*) AS total_placements,
        SUM(fee_amount_lpa) AS total_revenue_lpa,
        AVG(ctc_lpa) AS avg_ctc_lpa,
        COUNT(DISTINCT consultant_user_id) AS active_consultants
      FROM placement
    `);
    const statsRow = statsResult.rows[0];

    res.json({
      placements: listResult.rows,
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
