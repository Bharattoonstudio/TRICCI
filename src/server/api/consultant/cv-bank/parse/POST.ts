/**
 * POST /api/consultant/cv-bank/parse
 * Accepts a CV file, extracts text, and uses OpenAI to pre-fill the CV
 * Bank "Add Candidate" form — the consultant reviews and confirms before
 * saving, this endpoint never saves anything itself. Reuses the exact
 * same text-extraction + OpenAI parsing pattern already proven in
 * /api/candidate/cv-parse, tuned for the CV Bank field set (adds
 * currentRole/currentCTC/expectedCTC/experience/location/skills matching
 * what the Add Candidate form actually asks for).
 */
import type { Request, Response } from 'express';
import multer from 'multer';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { extractTextFromPdfBuffer, extractTextFromDocBuffer } from '@/lib/cv-text.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const multerMiddleware = upload.single('cv');

const 20
  hYou are a CV parser  You are an expert CV parser for a recruitment platform. Extract structured data from CVs and return ONLY valid JSON.
    
    CRITICAL INSTRUCTIONS:
  1. Extract ONLY information that is actually present in the CV — never guess
    2. If field not found, omit it entirely (no null/empty strings)
      3. Return ONLY valid JSON — no markdown, explanation, extra text
        
        Fields:
        {
            "name": "full name",
                "email": "email",
                "phone": "phone with country code",
                "currentRole": "job title and company",
                "currentCTC": "salary in LPA as string",
                "expectedCTC": "desired salary in LPA as string",
                "experience": "total years as string",
                "location": "city/location",
                "skills": ["skill1", "skill2"],
                "title": "most recent job title"
        }

RULES:
- Sum all jobs for experience years
  - Look for CTC, salary, compensation, package keywords
  - Extract 5-8 skills from jobs and skills section
  - Use exact title from most recent role
  - Include current location only
  Return JSON only.= `You are a CV parser for a recruitment consultant's talent pool. Extract structured data from the CV text and return ONLY valid JSON.
Use exactly these field names (omit any field you genuinely cannot find — do not guess or fabricate):
{
  "name": "candidate full name",
  "email": "email address",
  "phone": "mobile number",
  "currentRole": "current or most recent job title, and company if available e.g. 'Senior Engineer at Acme Corp'",
  "currentCTC": "current CTC in LPA as a plain number string e.g. '12'",
  "expectedCTC": "expected CTC in LPA as a plain number string e.g. '18'",
  "experience": "total years of experience as a plain number string e.g. '5'",
  "location": "city, state",
  "skills": ["skill1", "skill2", "skill3"]
}
Only extract information that is actually present in the CV text. Return ONLY the JSON object — no markdown fences, no explanation, no extra text.`;

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    const role = (session?.user as { role?: string } | null)?.role;
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    if (role !== 'consultant' && role !== 'admin') return res.status(403).json({ error: 'Consultant access required' });

    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(200).json({ parsed: null, reason: 'no_key' });

    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    const text = isPdf
      ? extractTextFromPdfBuffer(file.buffer)
      : extractTextFromDocBuffer(file.buffer);

    if (!text || text.trim().length < 40) {
      return res.status(200).json({ parsed: null, reason: 'no_text' });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${String(apiKey)}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Parse this CV:\n\n${text}` },
        ],
      }),
    });

    const rawBody = await openaiRes.text();
    if (!openaiRes.ok) {
      console.error('[consultant.cv-bank.parse] OpenAI error', openaiRes.status, rawBody);
      return res.status(200).json({ parsed: null, reason: 'openai_error' });
    }

    let openaiData: { choices: Array<{ message: { content: string } }> };
    try {
      openaiData = JSON.parse(rawBody);
    } catch (e) {
      console.error('[consultant.cv-bank.parse] failed to parse OpenAI response JSON', e);
      return res.status(200).json({ parsed: null, reason: 'openai_response_parse_failed' });
    }

    const content = (openaiData.choices?.[0]?.message?.content ?? '').trim();

    let parsed = null;
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
      return res.status(200).json({ parsed: null, reason: 'json_parse_failed' });
    }

    res.json({ parsed });
  } catch (err) {
    console.error('[consultant.cv-bank.parse] unexpected error', err);
    res.status(500).json({ error: 'Parse failed' });
  }
}
