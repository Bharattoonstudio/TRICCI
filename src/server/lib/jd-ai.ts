/**
 * Shared helpers for the employer "AI job description" features.
 *
 * - callOpenAIJson: one structured JSON call to OpenAI (server-side only; the key never reaches the browser)
 * - checkDailyLimit: per-employer daily cap so AI cost stays predictable
 * - extractJdText: reads text from an uploaded PDF / Word / text JD
 *
 * Only job text is ever sent to the model. No candidate data is included.
 */

const DAILY_LIMIT = 20;
const dailyUsage = new Map<string, { day: string; count: number }>();

export function checkDailyLimit(userId: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const entry = dailyUsage.get(userId);
  if (!entry || entry.day !== day) {
    dailyUsage.set(userId, { day, count: 1 });
    return true;
  }
  if (entry.count >= DAILY_LIMIT) return false;
  entry.count += 1;
  return true;
}

export const DAILY_LIMIT_MESSAGE = `You have used today's AI job description limit (${DAILY_LIMIT} per day). Please try again tomorrow, or write the description yourself.`;

export interface AiJdFields {
  title?: string;
  summary?: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  skills?: string;
}

const JD_JSON_RULES = `Return ONLY valid JSON with these keys (use empty strings where unknown):
{
  "title": "job title",
  "summary": "2-3 sentence role overview",
  "description": "about the role, as plain text paragraphs",
  "responsibilities": "one responsibility per line",
  "requirements": "one requirement per line (qualifications, experience, education)",
  "skills": "comma-separated key skills"
}
Rules:
- Do not invent company names, salary, benefits, locations, or facts that are not in the input.
- Keep language clear, inclusive and free of jargon. No discriminatory wording.
- Plain text only: no markdown, no bullet symbols, no numbering.`;

export function buildGeneratePrompt(input: { title: string; location?: string; experience?: string; skills?: string; notes?: string }): string {
  return `Write a complete job description for the role below. This is a draft the employer will review.
Role title: ${input.title}
${input.location ? `Location: ${input.location}` : ''}
${input.experience ? `Experience: ${input.experience}` : ''}
${input.skills ? `Skills mentioned by employer: ${input.skills}` : ''}
${input.notes ? `Employer notes: ${input.notes}` : ''}
Use standard, widely-accepted responsibilities and requirements for this role title. Mark nothing as confirmed that the employer did not provide.
${JD_JSON_RULES}`;
}

export function buildEnhancePrompt(input: { title?: string; description?: string; responsibilities?: string; requirements?: string; skills?: string; location?: string; experience?: string }): string {
  return `Improve and complete the job description below. Keep every fact the employer wrote. Make the wording clearer and more professional, and fill gaps in structure. Do not add facts that are not implied by the text.
Role title: ${input.title || '(not given)'}
${input.location ? `Location: ${input.location}` : ''}
${input.experience ? `Experience: ${input.experience}` : ''}
Current about-the-role text:
${input.description || '(empty)'}
Current responsibilities:
${input.responsibilities || '(empty)'}
Current requirements:
${input.requirements || '(empty)'}
Current skills:
${input.skills || '(empty)'}
${JD_JSON_RULES}`;
}

export async function callOpenAIJson(prompt: string): Promise<AiJdFields | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You write accurate, professional job descriptions for an Indian recruitment marketplace. Output JSON only.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    console.error('[jd-ai] OpenAI error', res.status);
    return null;
  }
  const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = body.choices?.[0]?.message?.content ?? '';
  try {
    const parsed = JSON.parse(content) as AiJdFields;
    return parsed;
  } catch {
    return null;
  }
}

/** Read text from an uploaded JD. Word uses mammoth; PDF uses pdfjs-dist; text is read as-is. */
export async function extractJdText(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  if (ext === 'docx' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (mimetype === 'application/pdf' || ext === 'pdf') {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), disableFontFace: true, useSystemFonts: false, verbosity: 0 }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
    }
    return pages.join('\n').replace(/[ \t]{2,}/g, ' ').trim();
  }

  return buffer.toString('utf-8').trim();
}
