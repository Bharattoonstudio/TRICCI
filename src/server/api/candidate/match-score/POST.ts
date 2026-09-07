/**
 * POST /api/candidate/match-score
 * Body: { jobId: string }
 *
 * Lightweight companion to /api/candidate/cv-enhance — this does NOT rewrite
 * the CV, it just scores how well the candidate's existing profile/CV fits
 * a specific job across several dimensions, so it can be shown inline on
 * the job detail page without the cost/latency of a full CV rewrite.
 */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { db } from '@/server/db/client.js';
import { candidateProfile, job } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { readExistingCvText } from '@/lib/cv-text.js';

const SYSTEM_PROMPT = `You are a recruitment matching engine. Given a candidate's background and a job description, score how well they fit across several dimensions.

Be honest and calibrated — do not default to high scores. Base every score only on evidence actually present in the candidate's material; if something isn't mentioned, treat it as unknown/absent rather than assuming it's fine.

Return ONLY valid JSON, no markdown fences, no explanation, in exactly this shape:
{
  "overall": 78,
  "breakdown": {
    "skills": 82,
    "experience": 75,
    "industry": 70,
    "location": 100,
    "noticePeriod": 60,
    "salary": 85
  },
  "missingSkills": ["Kubernetes", "GraphQL"],
  "suggestion": "One short, specific, actionable sentence on what would most improve this candidate's fit."
}

Scoring guidance:
- skills: overlap between candidate's actual skills and the JD's required/preferred skills.
- experience: years and seniority match against what the JD asks for.
- industry: how close the candidate's industry/domain background is to the JD's industry, if inferable.
- location: 100 if candidate location matches job location or job is remote; lower if a relocation would be needed; 50 if unknown.
- noticePeriod: 100 if candidate's notice period (if known) fits typical urgency; 50 if unknown.
- salary: 100 if candidate's expected/current CTC (if known) fits within the JD's range; 50 if unknown.
- If a dimension truly cannot be assessed from the given data, use 50 (neutral), never guess high.`;

interface MatchRequestBody {
  jobId?: string;
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const role = (session.user as { role?: string }).role;
    if (role !== 'candidate') return res.status(403).json({ error: 'Candidate access required' });

    const { jobId } = req.body as MatchRequestBody;
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });

    const [jobRow] = await db
      .select({
        id: job.id,
        title: job.title,
        location: job.location,
        locationType: job.locationType,
        ctcMin: job.ctcMin,
        ctcMax: job.ctcMax,
        skills: job.skills,
        experience: job.experience,
        experienceYears: job.experienceYears,
        category: job.category,
        description: job.description,
        requirements: job.requirements,
      })
      .from(job).where(eq(job.id, jobId)).limit(1);

    if (!jobRow) return res.status(404).json({ error: 'Job not found' });

    const [profileRow] = await db.select()
      .from(candidateProfile).where(eq(candidateProfile.userId, session.user.id)).limit(1);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(200).json({ scored: false, reason: 'no_key' });

    const cvText = await readExistingCvText(profileRow?.cvUrl ?? null);
    const profileLines = [
      profileRow?.currentTitle ? `Current title: ${profileRow.currentTitle}` : null,
      profileRow?.totalExperience ? `Total experience: ${profileRow.totalExperience} years` : null,
      profileRow?.location ? `Location: ${profileRow.location}` : null,
      profileRow?.noticePeriod ? `Notice period: ${profileRow.noticePeriod}` : null,
      profileRow?.currentCTC ? `Current CTC: ${(profileRow.currentCTC / 100000).toFixed(1)} LPA` : null,
      profileRow?.expectedCTC ? `Expected CTC: ${(profileRow.expectedCTC / 100000).toFixed(1)} LPA` : null,
      profileRow?.skills?.length ? `Skills: ${profileRow.skills.join(', ')}` : null,
      profileRow?.experience?.length
        ? `Experience:\n${profileRow.experience.map(e => `- ${e.title} at ${e.company} (${e.duration})`).join('\n')}`
        : null,
    ].filter(Boolean).join('\n');

    const candidateSource = [cvText, profileLines].filter(Boolean).join('\n\n');
    if (!candidateSource || candidateSource.trim().length < 20) {
      return res.status(200).json({ scored: false, reason: 'no_cv_data' });
    }

    const jdText = [
      `Job Title: ${jobRow.title}`,
      `Location: ${jobRow.location} (${jobRow.locationType})`,
      `Experience required: ${jobRow.experience}`,
      `Salary range: ${jobRow.ctcMin}-${jobRow.ctcMax} LPA`,
      jobRow.skills?.length ? `Required skills: ${jobRow.skills.join(', ')}` : null,
      jobRow.requirements?.length ? `Requirements:\n${jobRow.requirements.map(r => `- ${r}`).join('\n')}` : null,
      `Description: ${jobRow.description}`,
    ].filter(Boolean).join('\n');

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${String(apiKey)}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `CANDIDATE:\n${candidateSource}\n\nJOB:\n${jdText}` },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const rawBody = await openaiRes.text();
    if (!openaiRes.ok) {
      console.error('[match-score] OpenAI error', openaiRes.status, rawBody);
      return res.status(200).json({ scored: false, reason: 'openai_error' });
    }

    let openaiData: { choices: Array<{ message: { content: string } }> };
    try {
      openaiData = JSON.parse(rawBody);
    } catch {
      return res.status(200).json({ scored: false, reason: 'openai_response_parse_failed' });
    }

    const content = (openaiData.choices?.[0]?.message?.content ?? '').trim();
    let parsed: unknown = null;
    try {
      const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) { try { parsed = JSON.parse(match[0]); } catch { /* give up */ } }
    }

    if (!parsed) return res.status(200).json({ scored: false, reason: 'json_parse_failed' });

    const result = parsed as {
      overall?: number;
      breakdown?: Record<string, number>;
      missingSkills?: string[];
      suggestion?: string;
    };

    const clamp = (n: unknown) => {
      const num = typeof n === 'number' ? n : Number(n);
      return Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 50;
    };

    res.json({
      scored: true,
      jobTitle: jobRow.title,
      overall: clamp(result.overall),
      breakdown: {
        skills: clamp(result.breakdown?.skills),
        experience: clamp(result.breakdown?.experience),
        industry: clamp(result.breakdown?.industry),
        location: clamp(result.breakdown?.location),
        noticePeriod: clamp(result.breakdown?.noticePeriod),
        salary: clamp(result.breakdown?.salary),
      },
      missingSkills: Array.isArray(result.missingSkills) ? result.missingSkills.slice(0, 10) : [],
      suggestion: typeof result.suggestion === 'string' ? result.suggestion.slice(0, 300) : '',
    });
  } catch (err) {
    console.error('[match-score] unexpected error', err);
    res.status(500).json({ error: 'Match scoring failed' });
  }
}
