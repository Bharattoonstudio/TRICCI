/**
 * GET /api/employer/reports/:type
 * Generates real data for one of the 4 activity report templates.
 * ?format=csv downloads it as a CSV; otherwise returns JSON for the
 * "Run Now" inline preview. Org-wide scoped (a team's reports, not just
 * the literal job-poster's own postings).
 */
import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { job, submission, candidateApplication, placement, user } from '@/server/db/schema.js';
import { eq, inArray, gte, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { getOrgUserIds } from '@/server/lib/orgPermissions.js';

const VALID_TYPES = ['weekly-hiring-summary', 'monthly-placement-report', 'pipeline-health-check', 'consultant-performance'];

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  return '\uFEFF' + [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'employer' && role !== 'admin') return res.status(403).json({ error: 'Employer access required' });

    const type = String(req.params.type);
    if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
    const asCsv = req.query.format === 'csv';

    const orgUserIds = role === 'admin' ? null : await getOrgUserIds(session.user.id);
    const jobOwnerFilter = orgUserIds ? inArray(job.postedByUserId, orgUserIds) : undefined;

    if (type === 'weekly-hiring-summary') {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const apps = await db.select({ status: candidateApplication.status, createdAt: candidateApplication.createdAt, jobTitle: job.title })
        .from(candidateApplication).innerJoin(job, eq(candidateApplication.jobId, job.id))
        .where(jobOwnerFilter ? and(jobOwnerFilter, gte(candidateApplication.createdAt, since)) : gte(candidateApplication.createdAt, since));
      const subs = await db.select({ status: submission.status, createdAt: submission.createdAt, jobTitle: job.title })
        .from(submission).innerJoin(job, eq(submission.jobId, job.id))
        .where(jobOwnerFilter ? and(jobOwnerFilter, gte(submission.createdAt, since)) : gte(submission.createdAt, since));
      const all = [...apps, ...subs];
      const summary = {
        received: all.length,
        shortlisted: all.filter(r => ['shortlisted', 'interview', 'selected', 'offered'].includes(r.status)).length,
        interviews: all.filter(r => r.status === 'interview').length,
      };
      if (asCsv) {
        const csv = toCsv(['Job Title', 'Status', 'Received On'], all.map(r => [r.jobTitle, r.status, r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '']));
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="weekly-hiring-summary-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csv);
      }
      return res.json({ type, generatedAt: new Date().toISOString(), summary, rows: all.length });
    }

    if (type === 'monthly-placement-report') {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const placementFilter = orgUserIds ? inArray(placement.employerUserId, orgUserIds) : undefined;
      const placements = await db.select().from(placement)
        .where(placementFilter ? and(placementFilter, gte(placement.createdAt, since)) : gte(placement.createdAt, since));
      const summary = {
        positionsClosed: placements.filter(p => p.offerStatus === 'accepted').length,
        totalFeesLpa: placements.reduce((sum, p) => sum + (p.feeAmountLpa ?? 0), 0),
        consultantFeesLpa: placements.reduce((sum, p) => sum + (p.consultantFeeAmountLpa ?? 0), 0),
      };
      if (asCsv) {
        const csv = toCsv(
          ['Candidate', 'Job Title', 'Offer Status', 'CTC (LPA)', 'Fee (LPA)', 'Consultant Fee (LPA)', 'Created'],
          placements.map(p => [p.candidateName, p.jobTitle, p.offerStatus, p.ctcLpa ?? '', p.feeAmountLpa ?? '', p.consultantFeeAmountLpa ?? '', p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : ''])
        );
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="monthly-placement-report-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csv);
      }
      return res.json({ type, generatedAt: new Date().toISOString(), summary, rows: placements.length });
    }

    if (type === 'pipeline-health-check') {
      const staleThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const apps = await db.select({ status: candidateApplication.status, createdAt: candidateApplication.createdAt, jobTitle: job.title })
        .from(candidateApplication).innerJoin(job, eq(candidateApplication.jobId, job.id))
        .where(jobOwnerFilter);
      const subs = await db.select({ status: submission.status, createdAt: submission.createdAt, jobTitle: job.title })
        .from(submission).innerJoin(job, eq(submission.jobId, job.id))
        .where(jobOwnerFilter);
      const all = [...apps, ...subs];
      const earlyStatuses = ['pending', 'review', 'shortlisted'];
      const stale = all.filter(r => earlyStatuses.includes(r.status) && r.createdAt && new Date(r.createdAt) < staleThreshold);
      const summary = {
        staleApplications: stale.length,
        pendingInterviews: all.filter(r => r.status === 'interview').length,
        awaitingOffer: all.filter(r => r.status === 'selected').length,
      };
      if (asCsv) {
        const csv = toCsv(['Job Title', 'Status', 'Received On', 'Days Old'],
          stale.map(r => [r.jobTitle, r.status, r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '', r.createdAt ? Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86400000) : '']));
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="pipeline-health-check-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csv);
      }
      return res.json({ type, generatedAt: new Date().toISOString(), summary, rows: stale.length });
    }

    // consultant-performance
    const subFilter = orgUserIds ? jobOwnerFilter : undefined;
    const subs = await db.select({ consultantUserId: submission.consultantUserId, status: submission.status })
      .from(submission).innerJoin(job, eq(submission.jobId, job.id)).where(subFilter);
    const byConsultant = new Map<string, { submissions: number; shortlisted: number; placed: number }>();
    for (const s of subs) {
      const key = s.consultantUserId;
      const entry = byConsultant.get(key) ?? { submissions: 0, shortlisted: 0, placed: 0 };
      entry.submissions++;
      if (['shortlisted', 'interview', 'selected', 'offered'].includes(s.status)) entry.shortlisted++;
      if (s.status === 'offered') entry.placed++;
      byConsultant.set(key, entry);
    }
    const consultantIds = Array.from(byConsultant.keys());
    const consultants = consultantIds.length
      ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, consultantIds))
      : [];
    const nameMap = new Map(consultants.map(c => [c.id, c.name]));
    const rows = consultantIds.map(id => {
      const e = byConsultant.get(id)!;
      return {
        consultant: nameMap.get(id) ?? 'Unknown',
        submissions: e.submissions,
        shortlistRate: e.submissions ? Math.round((e.shortlisted / e.submissions) * 100) : 0,
        placementRate: e.submissions ? Math.round((e.placed / e.submissions) * 100) : 0,
      };
    });
    if (asCsv) {
      const csv = toCsv(['Consultant', 'Submissions', 'Shortlist Rate %', 'Placement Rate %'], rows.map(r => [r.consultant, r.submissions, r.shortlistRate, r.placementRate]));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="consultant-performance-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(csv);
    }
    return res.json({ type, generatedAt: new Date().toISOString(), summary: { consultants: rows.length }, rows: rows.length, data: rows });
  } catch (err) {
    console.error('[employer.reports] ERROR:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
}
