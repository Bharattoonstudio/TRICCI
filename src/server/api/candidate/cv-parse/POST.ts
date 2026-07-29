/**
 * POST /api/candidate/cv-parse
 * Accepts multipart/form-data with a `cv` file field.
 * Extracts text from PDF/DOC buffer and uses OpenAI to parse structured profile data.
 */
import type { Request, Response } from 'express';
import multer from 'multer';
import { toWebRequest } from '@/lib/auth/express-adapter.js';
import { getAuth } from '@/lib/auth/auth.js';
import { extractTextFromPdfBuffer, extractTextFromDocBuffer } from '@/lib/cv-text.js';

// Same fix as cv-upload: this route also had no multer middleware wired up
// in entry.ts, so req.file was always undefined here too.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const multerMiddleware = upload.single('cv');

const SYSTEM_PROMPT = `You are a CV parser. Extract structured data from the CV text and return ONLY valid JSON.
Use exactly these field names (omit any field you cannot find):
{
  "name": "candidate full name",
  "phone": "mobile number",
  "email": "email address",
  "location": "city, state",
  "currentTitle": "current or most recent job title",
  "totalExperience": "total years of experience as a plain number string e.g. '5'",
  "currentCTC": "current CTC in LPA as a plain number string e.g. '12'",
  "expectedCTC": "expected CTC in LPA as a plain number string e.g. '18'",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", "skill3"]
}
Return ONLY the JSON object. No markdown fences, no explanation, no extra text.`;

export default async function handler(req: Request, res: Response) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: toWebRequest(req).headers });
    if (!session) return res.status(401).json({ error: 'Unauthorized' });

    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(200).json({ parsed: null, reason: 'no_key' });

    // Extract text from buffer
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    const text = isPdf
      ? extractTextFromPdfBuffer(file.buffer)
      : extractTextFromDocBuffer(file.buffer);

    if (!text || text.trim().length < 40) {
      console.warn('[cv-parse] insufficient text extracted, length:', text.length);
      return res.status(200).json({ parsed: null, reason: 'no_text' });
    }

    console.log('[cv-parse] extracted text length:', text.length, '— calling OpenAI');

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
    console.log('[cv-parse] OpenAI status:', openaiRes.status, '— body preview:', rawBody.slice(0, 300));

    if (!openaiRes.ok) {
      console.error('[cv-parse] OpenAI error', openaiRes.status, rawBody);
      return res.status(200).json({ parsed: null, reason: 'openai_error' });
    }

    let openaiData: { choices: Array<{ message: { content: string } }> };
    try {
      openaiData = JSON.parse(rawBody);
    } catch (e) {
      console.error('[cv-parse] failed to parse OpenAI response JSON', e);
      return res.status(200).json({ parsed: null, reason: 'openai_response_parse_failed' });
    }

    const content = (openaiData.choices?.[0]?.message?.content ?? '').trim();
    console.log('[cv-parse] OpenAI content:', content.slice(0, 300));

    let parsed = null;
    try {
      // Strip markdown fences if present
      const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* give up */ }
      }
    }

    if (!parsed) {
      console.warn('[cv-parse] could not parse JSON from OpenAI response');
      return res.status(200).json({ parsed: null, reason: 'json_parse_failed' });
    }

    console.log('[cv-parse] success, fields:', Object.keys(parsed).join(', '));
    return res.json({ parsed });

  } catch (err) {
    console.error('[cv-parse] unexpected error', err);
    res.status(500).json({ error: 'Parse failed' });
  }
}
