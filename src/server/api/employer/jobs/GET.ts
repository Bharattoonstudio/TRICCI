import type { Request, Response } from 'express';
import { db } from '@/server/db/client.js';
import { job as jobTable } from '@/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';

interface JobResponse {
  id: string;
  title: string;
  department: string;
  location: string;
  ctcLabel: string;
  feePercent: number;
  status: string;
  priority: number;
  applicants: number;
  postedDays: number;
  skills?: string[];
  description?: string;
  interviewRounds?: { label: string; description: string }[];
}

export default async function handler(req: Request, res: Response) {
  try {
    // Get current logged-in employer
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers }).catch(() => null);
    
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const employerId = session.user.id;
    const userRole = (session.user as { role?: string })?.role;

    // Only employers can access their own jobs
    if (userRole !== 'employer') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch only THIS employer's jobs
    const rows = await db
      .select()
      .from(jobTable)
      .where(and(
        eq(jobTable.postedByUserId, employerId)
      ));

    // Map to response format
    const jobs: JobResponse[] = rows.map(r => ({
      id: r.id,
      title: r.title,
      department: r.department,
      location: r.location,
      ctcLabel: r.ctcLabel,
      feePercent: r.feePercent,
      status: r.status,
      priority: r.priority,
      applicants: r.applicants,
      postedDays: r.postedDays,
      skills: r.skills as string[],
      description: r.description,
      interviewRounds: r.interviewRounds as { label: string; description: string }[] | undefined,
    }));

    res.json({ jobs, total: jobs.length });
  } catch (err) {
    console.error('[GET /api/employer/jobs] Error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
}
