/**
 * POST /api/jobs/ai-draft
 * Employer-only. Returns an AI draft for the job form. Nothing is saved here;
 * the employer reviews the draft and applies it to the form themselves.
 *
 * Body:
 *   { mode: 'generate', title, location?, experience?, skills?, notes? }  -> full JD from a position name
 *   { mode: 'enhance', title?, description?, responsibilities?, requirements?, skills?, location?, experience? }
 *
 * Response: { draft: AiJdFields } or { draft: null, reason }
 */
import type { Request, Response } from 'express';
import { getAuth } from '@/lib/auth/auth.js';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import {
  buildEnhancePrompt,
  buildGeneratePrompt,
  callOpenAIJson,
  checkDailyLimit,
  DAILY_LIMIT_MESSAGE,
} from '@/server/lib/jd-ai.js';

const MAX_TEXT = 6000;
const clip = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async function handler(req: Request, res: Response) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const role = (session.user as { role?: string }).role;
    if (role !== 'employer' && role !== 'admin') {
      return res.status(403).json({ error: 'Only employers can use AI job descriptions' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({ draft: null, reason: 'ai_not_configured' });
    }
    if (!checkDailyLimit(session.user.id)) {
      return res.status(429).json({ draft: null, reason: 'daily_limit', message: DAILY_LIMIT_MESSAGE });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const mode = body.mode;

    let prompt: string;
    if (mode === 'generate') {
      const title = clip(body.title, 200);
      if (!title) return res.status(400).json({ error: 'Position name is required' });
      prompt = buildGeneratePrompt({
        title,
        location: clip(body.location, 200),
        experience: clip(body.experience, 200),
        skills: clip(body.skills, 500),
        notes: clip(body.notes),
      });
    } else if (mode === 'enhance') {
      const description = clip(body.description);
      const responsibilities = clip(body.responsibilities);
      const requirements = clip(body.requirements);
      if (!description && !responsibilities && !requirements) {
        return res.status(400).json({ error: 'Write some job details first, then ask AI to enhance them' });
      }
      prompt = buildEnhancePrompt({
        title: clip(body.title, 200),
        description,
        responsibilities,
        requirements,
        skills: clip(body.skills, 500),
        location: clip(body.location, 200),
        experience: clip(body.experience, 200),
      });
    } else {
      return res.status(400).json({ error: 'mode must be "generate" or "enhance"' });
    }

    const draft = await callOpenAIJson(prompt);
    if (!draft) return res.status(200).json({ draft: null, reason: 'ai_error' });
    return res.status(200).json({ draft });
  } catch (error) {
    console.error('[jobs/ai-draft] error', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'Could not create the AI draft. Please try again.' });
  }
}
