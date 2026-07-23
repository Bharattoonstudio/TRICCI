/**
 * POST /api/jobs/parse-jd
 * Accepts multipart/form-data with a `jd` file field (PDF, DOC, DOCX, TXT).
 * Extracts text and parses it into structured job fields.
 * Returns: { title, department, location, experience, skills, description,
 *            responsibilities, requirements, rawText }
 */
import type { Request, Response } from 'express';

// ── Text extraction helpers ──────────────────────────────────────────────────

async function extractText(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  // Plain text
  if (mimetype === 'text/plain' || ext === 'txt') {
    return buffer.toString('utf-8');
  }

  // PDF — use pdf-parse if available, else fall back to raw buffer string scan
  if (mimetype === 'application/pdf' || ext === 'pdf') {
    // Extract printable ASCII from PDF buffer (no native deps needed)
    return buffer.toString('latin1').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n');
  }

  // DOC / DOCX — extract readable text from XML inside the zip
  if (ext === 'docx' || mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      // DOCX is a zip — find word/document.xml and strip tags
      const text = buffer.toString('latin1');
      const xmlMatch = text.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
      if (xmlMatch) {
        return xmlMatch.map(m => m.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim();
      }
    } catch { /* fall through */ }
  }

  // Fallback: treat as text
  return buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));
}

// ── Parsing helpers ──────────────────────────────────────────────────────────

function extractSection(text: string, headings: string[]): string {
  const pattern = headings.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(
    `(?:^|\\n)\\s*(?:${pattern})\\s*[:\\-]?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:[A-Z][A-Za-z ]{2,30})[:\\-]?\\s*\\n|$)`,
    'i',
  );
  const match = text.match(regex);
  if (!match) return '';
  return match[1].trim();
}

function extractBullets(section: string): string[] {
  if (!section) return [];
  return section
    .split('\n')
    .map(l => l.replace(/^[\s•\-\*\u2022\u25CF\u25AA\u2013\u2014]+/, '').trim())
    .filter(l => l.length > 10);
}

function parseExperience(text: string): string {
  const patterns = [
    /(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)/i,
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i,
    /minimum\s+(\d+)\s*(?:years?|yrs?)/i,
    /at\s+least\s+(\d+)\s*(?:years?|yrs?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      if (m[2]) return `${m[1]}–${m[2]} years`;
      return `${m[1]}+ years`;
    }
  }
  return '';
}

function parseSkills(text: string): string {
  // Look for skills section first
  const skillsSection = extractSection(text, [
    'Skills', 'Required Skills', 'Technical Skills', 'Key Skills',
    'Technologies', 'Tech Stack', 'Tools', 'Competencies',
  ]);

  const skillsText = skillsSection || text;

  // Common tech/skill tokens
  const techPattern = /\b(React|Angular|Vue|Node\.?js|Python|Java|Go|Golang|Rust|C\+\+|C#|\.NET|PHP|Ruby|Swift|Kotlin|TypeScript|JavaScript|SQL|MySQL|PostgreSQL|MongoDB|Redis|AWS|Azure|GCP|Docker|Kubernetes|Git|REST|GraphQL|Microservices|Agile|Scrum|JIRA|Figma|Sketch|Tableau|Power\s?BI|Excel|Salesforce|SAP|Linux|HTML|CSS|TailwindCSS|Bootstrap|Django|Flask|Spring|Express|Next\.?js|Nuxt|Svelte|TensorFlow|PyTorch|Pandas|NumPy|Spark|Hadoop|Kafka|RabbitMQ|Elasticsearch|CI\/CD|Jenkins|GitHub|GitLab|Terraform|Ansible|Machine\s?Learning|Deep\s?Learning|NLP|Data\s?Science|Product\s?Management|Project\s?Management|Leadership|Communication|Analytical|Problem.?Solving)\b/gi;

  const found = new Set<string>();
  let m;
  const re = new RegExp(techPattern.source, 'gi');
  while ((m = re.exec(skillsText)) !== null) {
    found.add(m[0].trim());
  }

  // Also grab comma/slash separated items from skills section
  if (skillsSection) {
    skillsSection.split(/[,\/\n•\-\*]/).forEach(s => {
      const clean = s.trim().replace(/^[\s\-•*]+/, '').trim();
      if (clean.length >= 2 && clean.length <= 40 && /^[A-Za-z0-9 .#+\-_/]+$/.test(clean)) {
        found.add(clean);
      }
    });
  }

  return Array.from(found).slice(0, 20).join(', ');
}

function parseTitle(text: string): string {
  // First non-empty line is often the title
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (line.length < 80 && !/^(job|position|role|about|company|we are|we're)/i.test(line)) {
      return line.replace(/[:\-|]+$/, '').trim();
    }
  }
  return '';
}

function parseDepartment(text: string): string {
  const m = text.match(/\b(Engineering|Product|Design|Marketing|Sales|Finance|HR|Human\s+Resources|Operations|Legal|Data|Analytics|DevOps|QA|Customer\s+Success|Support|Research|Strategy|Business\s+Development)\b/i);
  return m ? m[1] : '';
}

function parseLocation(text: string): string {
  const m = text.match(/\b(Bengaluru|Bangalore|Mumbai|Delhi|NCR|Hyderabad|Chennai|Pune|Kolkata|Gurgaon|Noida|Ahmedabad|Remote|Hybrid|Pan\s+India|India)\b/i);
  return m ? m[1] : '';
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: Request, res: Response) {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const rawText = await extractText(file.buffer, file.mimetype, file.originalname);
    if (!rawText || rawText.trim().length < 20) {
      return res.status(422).json({ error: 'Could not extract readable text from this file' });
    }

    // Parse structured fields
    const title = parseTitle(rawText);
    const department = parseDepartment(rawText);
    const location = parseLocation(rawText);
    const experience = parseExperience(rawText);
    const skills = parseSkills(rawText);

    // Responsibilities
    const respSection = extractSection(rawText, [
      'Responsibilities', 'Key Responsibilities', 'Role & Responsibilities',
      'What You\'ll Do', 'What you will do', 'Duties', 'Job Duties',
      'Your Role', 'The Role',
    ]);
    const responsibilities = extractBullets(respSection).join('\n');

    // Requirements
    const reqSection = extractSection(rawText, [
      'Requirements', 'Required Qualifications', 'Qualifications',
      'What We\'re Looking For', 'What we look for', 'Must Have',
      'Minimum Qualifications', 'Basic Qualifications', 'You Should Have',
    ]);
    const requirements = extractBullets(reqSection).join('\n');

    // Description — About the Role section or first meaningful paragraph
    const descSection = extractSection(rawText, [
      'About the Role', 'About This Role', 'Role Overview', 'Job Summary',
      'Overview', 'Position Summary', 'Job Description', 'About the Position',
    ]);
    let description = descSection;
    if (!description) {
      // Use first 3–5 paragraphs of raw text as description
      const paras = rawText.split(/\n{2,}/).filter(p => p.trim().length > 40);
      description = paras.slice(0, 3).join('\n\n').trim();
    }

    res.json({
      title,
      department,
      location,
      experience,
      skills,
      description,
      responsibilities,
      requirements,
      rawText: rawText.slice(0, 8000), // cap for safety
    });
  } catch (err) {
    console.error('[POST /api/jobs/parse-jd] error:', err);
    res.status(500).json({ error: 'Failed to parse JD' });
  }
}
