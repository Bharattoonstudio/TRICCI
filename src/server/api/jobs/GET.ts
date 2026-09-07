import type { Request, Response } from 'express';
import { db } from '../../db/client.js';
import { job as jobTable } from '../../db/schema.js';
import { eq, and, gte } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { hasSignedAgreement } from '@/server/lib/requireAgreement.js';

export interface InterviewRound {
  label: string;
  description: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  department: string;
  location: string;
  locationType: 'onsite' | 'remote' | 'hybrid';
  ctcMin: number;
  ctcMax: number;
  ctcLabel: string;
  experience: string;
  experienceYears: number;
  category: string;
  skills: string[];
  description: string;
  responsibilities: string[];
  requirements: string[];
  postedDays: number;
  status: 'active' | 'paused';
  applicants: number;
  feePercent: number;
  interviewRounds?: InterviewRound[];
  /** 'public' (default) | 'consultant_only' | 'confidential' */
  visibility?: string;
  /** true when this job's real company name is masked for the current viewer */
  companyHidden?: boolean;
}

// Seed data kept for the seed-jobs script only — NOT used as a runtime fallback
export const JOBS_DATA: Job[] = [];

export default async function handler(req: Request, res: Response) {
  try {
    const { category, location, locationType, q, minExp } = req.query;

    // Resolve viewer (optional — guests are allowed, they just only see public jobs)
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers }).catch(() => null);
    const viewerRole = (session?.user as { role?: string } | null)?.role ?? null;
    const viewerId = session?.user?.id ?? null;

    // Point 25: a logged-in consultant cannot see job listings until they've
    // signed the agreement. Guests and candidates are unaffected — this
    // shared endpoint stays public for SEO/browsing; the gate only applies
    // to authenticated consultants specifically.
    if (viewerRole === 'consultant' && viewerId) {
      const signed = await hasSignedAgreement(viewerId, 'consultant');
      if (!signed) {
        return res.json({ jobs: [], total: 0, agreementRequired: true });
      }
    }

    // Build WHERE conditions
    const conditions = [eq(jobTable.status, 'active')];

    if (typeof category === 'string' && category !== 'all') {
      conditions.push(eq(jobTable.category, category));
    }
    if (typeof locationType === 'string' && locationType !== 'all') {
      conditions.push(eq(jobTable.locationType, locationType));
    }
    if (typeof minExp === 'string' && !isNaN(parseInt(minExp, 10))) {
      conditions.push(gte(jobTable.experienceYears, parseInt(minExp, 10)));
    }

    let rows = await db
      .select()
      .from(jobTable)
      .where(and(...conditions));

    // ── Visibility filter ────────────────────────────────────────────────
    // 'public' jobs: visible to everyone.
    // 'consultant_only' / 'confidential' jobs: visible only to consultants,
    // admins, or the employer who posted them.
    rows = rows.filter(r => {
      if (r.visibility === 'public' || !r.visibility) return true;
      if (viewerRole === 'admin' || viewerRole === 'consultant') return true;
      if (viewerRole === 'employer' && viewerId === r.postedByUserId) return true;
      return false;
    });

    // Post-filter: text search (title/company/skills) — done in JS to avoid JSON column complexity
    if (typeof q === 'string' && q.trim()) {
      const query = q.toLowerCase();
      rows = rows.filter(j =>
        j.title.toLowerCase().includes(query) ||
        j.company.toLowerCase().includes(query) ||
        j.department.toLowerCase().includes(query) ||
        (j.skills as string[]).some(s => s.toLowerCase().includes(query))
      );
    }

    // Post-filter: location substring match
    if (typeof location === 'string' && location !== 'all') {
      const loc = location.toLowerCase();
      rows = rows.filter(j => j.location.toLowerCase().includes(loc));
    }

    // Normalise JSON columns so the response shape matches the Job interface
    const jobs: Job[] = rows.map(r => {
      // Confidential jobs mask the real company name for everyone except
      // an admin or the employer who owns the posting.
      const isOwnerOrAdmin = viewerRole === 'admin' || (viewerRole === 'employer' && viewerId === r.postedByUserId);
      const companyHidden = r.visibility === 'confidential' && !isOwnerOrAdmin;

      return {
        id: r.id,
        title: r.title,
        company: companyHidden ? 'Confidential' : r.company,
        department: r.department,
        location: r.location,
        locationType: r.locationType as Job['locationType'],
        ctcMin: r.ctcMin,
        ctcMax: r.ctcMax,
        ctcLabel: r.ctcLabel,
        experience: r.experience,
        experienceYears: r.experienceYears,
        category: r.category,
        skills: r.skills as string[],
        description: r.description,
        responsibilities: r.responsibilities as string[],
        requirements: r.requirements as string[],
        postedDays: r.postedDays,
        status: r.status as Job['status'],
        applicants: r.applicants,
        feePercent: r.feePercent,
        visibility: r.visibility ?? 'public',
        companyHidden,
      };
    });

    res.json({ jobs, total: jobs.length });
  } catch (err) {
    console.error('[GET /api/jobs] DB error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs. Please try again shortly.' });
  }
}
