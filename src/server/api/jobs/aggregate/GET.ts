/**
 * GET /api/jobs/aggregate
 * Free job aggregator — pulls from multiple free public job APIs.
 * No paid credits required. Sources:
 *   1. Remotive (remote tech jobs) — free JSON API
 *   2. RemoteOK (global remote jobs) — free JSON feed
 *   3. Arbeitnow (EU + remote) — free API
 *   4. The Muse — free public API
 *
 * Query params:
 *   q        — keyword search (title / company / tags)
 *   location — location filter (text match)
 *   type     — full_time | part_time | contract | internship
 *   source   — remotive | remoteok | arbeitnow | themuse | all (default: all)
 *   page     — page number (default: 1)
 *   limit    — results per page (default: 20, max: 50)
 */
import type { Request, Response } from 'express';

export interface AggregatedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  tags: string[];
  description: string;
  url: string;
  source: string;
  sourceLogo: string;
  postedAt: string;
  salary?: string;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchRemotive(q: string): Promise<AggregatedJob[]> {
  try {
    const url = `https://remotive.com/api/remote-jobs?limit=100${q ? `&search=${encodeURIComponent(q)}` : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as { jobs?: RemotiveJob[] };
    return (data.jobs ?? []).map((j) => ({
      id: `remotive-${j.id}`,
      title: j.title,
      company: j.company_name,
      location: j.candidate_required_location || 'Remote',
      type: j.job_type || 'full_time',
      tags: j.tags ?? [],
      description: stripHtml(j.description ?? '').slice(0, 300),
      url: j.url,
      source: 'Remotive',
      sourceLogo: 'https://remotive.com/favicon.ico',
      postedAt: j.publication_date,
      salary: j.salary || undefined,
    }));
  } catch {
    return [];
  }
}

async function fetchRemoteOK(q: string): Promise<AggregatedJob[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'TRICCI Job Aggregator (tricci.in)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json() as RemoteOKJob[];
    const jobs = data.filter((j) => j.id && j.position);
    return jobs
      .filter((j) => !q || matchesQuery(q, `${j.position} ${j.company} ${(j.tags ?? []).join(' ')}`))
      .slice(0, 80)
      .map((j) => ({
        id: `remoteok-${j.id}`,
        title: j.position,
        company: j.company,
        location: j.location || 'Remote',
        type: 'full_time',
        tags: j.tags ?? [],
        description: stripHtml(j.description ?? '').slice(0, 300),
        url: j.url,
        source: 'RemoteOK',
        sourceLogo: 'https://remoteok.com/favicon.ico',
        postedAt: j.date || new Date().toISOString(),
        salary: j.salary || undefined,
      }));
  } catch {
    return [];
  }
}

async function fetchArbeitnow(q: string): Promise<AggregatedJob[]> {
  try {
    const url = `https://www.arbeitnow.com/api/job-board-api?page=1${q ? `&search=${encodeURIComponent(q)}` : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as { data?: ArbeitnowJob[] };
    return (data.data ?? []).slice(0, 80).map((j) => ({
      id: `arbeitnow-${j.slug}`,
      title: j.title,
      company: j.company_name,
      location: j.location || 'Remote',
      type: j.job_types?.[0] || 'full_time',
      tags: j.tags ?? [],
      description: stripHtml(j.description ?? '').slice(0, 300),
      url: j.url,
      source: 'Arbeitnow',
      sourceLogo: 'https://www.arbeitnow.com/favicon.ico',
      postedAt: new Date(j.created_at * 1000).toISOString(),
      salary: undefined,
    }));
  } catch {
    return [];
  }
}

async function fetchTheMuse(q: string): Promise<AggregatedJob[]> {
  try {
    const url = `https://www.themuse.com/api/public/jobs?page=1&descending=true${q ? `&category=${encodeURIComponent(q)}` : ''}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as { results?: TheMuseJob[] };
    return (data.results ?? []).slice(0, 60).map((j) => ({
      id: `themuse-${j.id}`,
      title: j.name,
      company: j.company?.name ?? 'Unknown',
      location: j.locations?.map((l) => l.name).join(', ') || 'Various',
      type: j.type || 'full_time',
      tags: j.categories?.map((c) => c.name) ?? [],
      description: stripHtml(j.contents ?? '').slice(0, 300),
      url: j.refs?.landing_page ?? j.refs?.landing_page ?? '#',
      source: 'The Muse',
      sourceLogo: 'https://www.themuse.com/favicon.ico',
      postedAt: j.publication_date || new Date().toISOString(),
      salary: undefined,
    }));
  } catch {
    return [];
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function matchesQuery(q: string, text: string): boolean {
  const lower = q.toLowerCase();
  return text.toLowerCase().includes(lower);
}

function filterJobs(jobs: AggregatedJob[], q: string, location: string, type: string): AggregatedJob[] {
  return jobs.filter((j) => {
    if (q && !matchesQuery(q, `${j.title} ${j.company} ${j.tags.join(' ')} ${j.description}`)) return false;
    if (location && !matchesQuery(location, j.location)) return false;
    if (type && type !== 'all' && j.type && !j.type.toLowerCase().includes(type.toLowerCase())) return false;
    return true;
  });
}

// ─── Type definitions ─────────────────────────────────────────────────────────

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location: string;
  job_type: string;
  tags: string[];
  description: string;
  url: string;
  publication_date: string;
  salary: string;
}

interface RemoteOKJob {
  id: string;
  position: string;
  company: string;
  location: string;
  tags: string[];
  description: string;
  url: string;
  date: string;
  salary: string;
}

interface ArbeitnowJob {
  slug: string;
  title: string;
  company_name: string;
  location: string;
  job_types: string[];
  tags: string[];
  description: string;
  url: string;
  created_at: number;
}

interface TheMuseJob {
  id: number;
  name: string;
  company: { name: string };
  locations: { name: string }[];
  type: string;
  categories: { name: string }[];
  contents: string;
  refs: { landing_page: string };
  publication_date: string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req: Request, res: Response) {
  try {
    const q = (req.query.q as string) || '';
    const location = (req.query.location as string) || '';
    const type = (req.query.type as string) || '';
    const source = (req.query.source as string) || 'all';
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

    // Fetch from all sources in parallel
    const fetchers: Promise<AggregatedJob[]>[] = [];
    if (source === 'all' || source === 'remotive') fetchers.push(fetchRemotive(q));
    if (source === 'all' || source === 'remoteok') fetchers.push(fetchRemoteOK(q));
    if (source === 'all' || source === 'arbeitnow') fetchers.push(fetchArbeitnow(q));
    if (source === 'all' || source === 'themuse') fetchers.push(fetchTheMuse(q));

    const results = await Promise.allSettled(fetchers);
    let allJobs: AggregatedJob[] = results
      .filter((r): r is PromiseFulfilledResult<AggregatedJob[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);

    // Apply filters
    allJobs = filterJobs(allJobs, q, location, type);

    // Sort by date descending
    allJobs.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

    // Deduplicate by title+company
    const seen = new Set<string>();
    allJobs = allJobs.filter((j) => {
      const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const total = allJobs.length;
    const start = (page - 1) * limit;
    const paginated = allJobs.slice(start, start + limit);

    res.json({
      jobs: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      sources: ['Remotive', 'RemoteOK', 'Arbeitnow', 'The Muse'],
    });
  } catch (err) {
    console.error('jobs.aggregate.error', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
}
