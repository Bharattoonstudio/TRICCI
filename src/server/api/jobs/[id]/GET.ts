import type { Request, Response } from 'express';
import { db } from '../../../db/client.js';
import { job as jobTable } from '../../../db/schema.js';
import { sql } from 'drizzle-orm';
import type { Job } from '../GET.js';

export default async function handler(req: Request, res: Response) {
  const id = String(req.params.id);

  try {
    const rows = await db
      .select()
      .from(jobTable)
      .where(sql`${jobTable.id} = ${id}`);

    if (!rows.length) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const r = rows[0];
    const job: Job = {
      id: r.id,
      title: r.title,
      company: r.company,
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
    };

    res.json({ job });
  } catch (err) {
    console.error(`[GET /api/jobs/${id}] DB error:`, err);
    res.status(500).json({ error: 'Failed to fetch job. Please try again shortly.' });
  }
}
