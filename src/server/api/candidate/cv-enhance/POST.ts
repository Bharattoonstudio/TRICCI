/**
 * POST /api/candidate/cv-enhance
 * Body: { jobId: string }
 *
 * Analyzes the candidate's existing CV/profile against a specific job's JD,
 * and asks OpenAI to produce an honestly-tailored version of the CV that
 * emphasizes the candidate's real, relevant skills/experience so it aligns
 * closely with the JD (target ~80%+ match on genuine overlap — the model is
 * explicitly instructed never to invent skills or experience the candidate
 * doesn't have).
 *
 * This endpoint is preview-only: nothing is saved. The candidate reviews the
 * result in the UI, then calls /api/candidate/cv-enhance/pdf to render and
 * download a PDF once they approve it, and optionally attaches it when
 * applying via /api/jobs/:id/apply.
 */
import type { Request, Response } from 'express';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { db } from '@/server/db/client.js';
import { candidateProfile, job, user } from '@/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { readExistingCvText } from '@/lib/cv-text.js';

const SYSTEM_PROMPT = `You are an expert career coach and CV writer helping a candidate tailor their CV for a specific job description (JD).

You will be given:
1. The candidate's existing CV text and/or profile data (their real skills, titles, experience, education).
2. A target job description.

Your job:
- Estimate a "before" match score (0-100) for how well the candidate's CURRENT CV/profile aligns with the JD, based on overlapping skills, experience level, and keywords.
- Rewrite/restructure the CV content so it truthfully emphasizes the candidate's genuinely relevant skills, achievements and experience that match the JD — reordering, rephrasing, and surfacing relevant keywords the candidate actually has.
- NEVER invent skills, tools, certifications, job titles, employers, or years of experience the candidate does not already have evidence of in their source material. Do not fabricate metrics/numbers that aren't implied by the source. This is a hard rule — honesty over score.
- Estimate an "after" match score (0-100) for the enhanced version.
- List any genuine, honest keyword/skill gaps between the JD and the candidate that were NOT added (because the candidate doesn't have them) — these are useful for the candidate to know, not something to fake.
- If after applying only truthful improvements the match still falls below 80%, that's fine — report the real number. Do not inflate it.

Return ONLY valid JSON, no markdown fences, no explanation, in exactly this shape:
{
  "matchScoreBefore": 62,
  "matchScoreAfter": 84,
  "gaps": ["Kubernetes", "GraphQL"],
  "enhancedCv": {
    "name": "Full Name",
    "currentTitle": "role title",
    "summary": "2-4 sentence professional summary tailored to this JD, truthful",
    "skills": ["skill1", "skill2", "..."],
    "experience": [
      { "title": "Job Title", "company": "Company", "duration": "Jan 2022 - Present", "bullets": ["Rewritten, JD-aligned bullet point 1", "..."] }
    ],
    "education": [ { "degree": "B.Tech Computer Science", "institution": "XYZ University", "year": "2019" } ]
  }
}`;

interface EnhanceRequestBody {
  jobId?: string;
}

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const role = (session.user as { role?: string }).role;
    if (role !== 'candidate') return res.status(403).json({ error: 'Candidate access required' });

    const { jobId } = req.body as EnhanceRequestBody;
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });

    // Fetch job
    const [jobRow] = await db
      .select({
        id: job.id,
        title: job.title,
        company: job.company,
        description: job.description,
        skills: job.skills,
        responsibilities: job.responsibilities,
        requirements: job.requirements,
        experience: job.experience,
      })
      .from(job).where(eq(job.id, jobId)).limit(1);

    if (!jobRow) return res.status(404).json({ error: 'Job not found' });

    // Fetch candidate user + profile
    const [userRow] = await db.select({ name: user.name, email: user.email })
      .from(user).where(eq(user.id, session.user.id)).limit(1);

    const [profileRow] = await db.select()
      .from(candidateProfile).where(eq(candidateProfile.userId, session.user.id)).limit(1);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(200).json({ enhanced: null, reason: 'no_key' });

    // Build candidate source material: prefer actual uploaded CV text, fall back to profile fields
    const cvText = await readExistingCvText(profileRow?.cvUrl ?? null);

    const profileSummaryLines = [
      profileRow?.currentTitle ? `Current title: ${profileRow.currentTitle}` : null,
      profileRow?.totalExperience ? `Total experience: ${profileRow.totalExperience} years` : null,
      profileRow?.location ? `Location: ${profileRow.location}` : null,
      profileRow?.summary ? `Summary: ${profileRow.summary}` : null,
      profileRow?.skills?.length ? `Skills: ${profileRow.skills.join(', ')}` : null,
      profileRow?.experience?.length
        ? `Experience:\n${profileRow.experience.map(e => `- ${e.title} at ${e.company} (${e.duration})`).join('\n')}`
        : null,
      profileRow?.education?.length
        ? `Education:\n${profileRow.education.map(e => `- ${e.degree}, ${e.institution} (${e.year})`).join('\n')}`
        : null,
    ].filter(Boolean).join('\n');

    const candidateSource = [cvText, profileSummaryLines].filter(Boolean).join('\n\n');

    if (!candidateSource || candidateSource.trim().length < 30) {
      return res.status(200).json({
        enhanced: null,
        reason: 'no_cv_data',
        message: 'Please upload a CV or fill in your profile (skills, experience) before using the AI CV Enhancer.',
      });
    }

    const jdText = [
      `Job Title: ${jobRow.title}`,
      `Company: ${jobRow.company}`,
      `Experience required: ${jobRow.experience}`,
      jobRow.skills?.length ? `Required skills: ${jobRow.skills.join(', ')}` : null,
      jobRow.requirements?.length ? `Requirements:\n${jobRow.requirements.map(r => `- ${r}`).join('\n')}` : null,
      jobRow.responsibilities?.length ? `Responsibilities:\n${jobRow.responsibilities.map(r => `- ${r}`).join('\n')}` : null,
      `Description: ${jobRow.description}`,
    ].filter(Boolean).join('\n');

    const userPrompt = `CANDIDATE NAME: ${userRow?.name ?? 'Candidate'}
CANDIDATE EMAIL: ${userRow?.email ?? ''}
CANDIDATE PHONE: ${profileRow?.phone ?? ''}

--- CANDIDATE SOURCE MATERIAL (CV text and/or profile) ---
${candidateSource}

--- TARGET JOB DESCRIPTION ---
${jdText}`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${String(apiKey)}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    const rawBody = await openaiRes.text();
    if (!openaiRes.ok) {
      console.error('[cv-enhance] OpenAI error', openaiRes.status, rawBody);
      return res.status(200).json({ enhanced: null, reason: 'openai_error' });
    }

    let openaiData: { choices: Array<{ message: { content: string } }> };
    try {
      openaiData = JSON.parse(rawBody);
    } catch (e) {
      console.error('[cv-enhance] failed to parse OpenAI response JSON', e);
      return res.status(200).json({ enhanced: null, reason: 'openai_response_parse_failed' });
    }

    const content = (openaiData.choices?.[0]?.message?.content ?? '').trim();

    let parsed: unknown = null;
    try {
      const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* give up */ }
      }
    }

    if (!parsed) {
      console.warn('[cv-enhance] could not parse JSON from OpenAI response');
      return res.status(200).json({ enhanced: null, reason: 'json_parse_failed' });
    }

    const result = parsed as {
      matchScoreBefore?: number;
      matchScoreAfter?: number;
      gaps?: string[];
      enhancedCv?: Record<string, unknown>;
    };

    // Fill in contact fields the model doesn't need to guess
    if (result.enhancedCv) {
      result.enhancedCv.email = userRow?.email ?? '';
      result.enhancedCv.phone = profileRow?.phone ?? '';
      result.enhancedCv.location = profileRow?.location ?? '';
      if (!result.enhancedCv.name) result.enhancedCv.name = userRow?.name ?? 'Candidate';
    }

    return res.json({
      enhanced: true,
      jobTitle: jobRow.title,
      company: jobRow.company,
      matchScoreBefore: clampScore(result.matchScoreBefore),
      matchScoreAfter: clampScore(result.matchScoreAfter),
      gaps: Array.isArray(result.gaps) ? result.gaps : [],
      enhancedCv: result.enhancedCv,
    });
  } catch (err) {
    console.error('[cv-enhance] unexpected error', err);
    res.status(500).json({ error: 'CV enhancement failed' });
  }
}

function clampScore(n: unknown): number {
  const num = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}
