/**
 * Shared CV helpers: best-effort text extraction from PDF/DOC buffers, and
 * mapping between the public `/airo-assets/...` CV URL and its real path on
 * disk (`/shared-storage/public/assets/...`). Used by cv-parse and the AI
 * CV-enhancement endpoints so we don't duplicate the extraction logic.
 */
import { readFile } from 'fs/promises';

/** Best-effort plain-text extraction from a PDF buffer (no native deps) */
export function extractTextFromPdfBuffer(buf: Buffer): string {
  const raw = buf.toString('latin1');

  // Pull all string objects between ( ) — covers most text-encoded PDFs
  const chunks: string[] = [];

  // BT...ET blocks
  const btEt = raw.match(/BT[\s\S]*?ET/g) ?? [];
  for (const block of btEt) {
    const strings = block.match(/\(([^)\\]*(?:\\.[^)\\]*)*)\)/g) ?? [];
    for (const s of strings) {
      const inner = s.slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\(.)/g, '$1');
      chunks.push(inner);
    }
  }

  let text = chunks.join(' ');

  // Fallback: grab all printable ASCII if BT/ET yielded nothing useful
  if (text.trim().length < 80) {
    text = raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ');
  }

  return text.replace(/\s{3,}/g, '\n').trim().slice(0, 7000);
}

/** Best-effort plain-text extraction from a DOC/DOCX buffer */
export function extractTextFromDocBuffer(buf: Buffer): string {
  return buf.toString('utf-8')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s{3,}/g, '\n')
    .trim()
    .slice(0, 7000);
}

/** Picks the right extractor based on filename/mimetype and returns extracted text */
export function extractCvText(buf: Buffer, filenameOrMime: string): string {
  const isPdf = filenameOrMime.toLowerCase().includes('pdf');
  return isPdf ? extractTextFromPdfBuffer(buf) : extractTextFromDocBuffer(buf);
}

const PUBLIC_PREFIX = '/airo-assets/uploads/cvs/';
const DISK_DIR = '/shared-storage/public/assets/uploads/cvs';

/** Converts a stored `cvUrl` (public path) into its real path on disk, or null if it doesn't match the expected shape */
export function cvUrlToDiskPath(cvUrl: string | null | undefined): string | null {
  if (!cvUrl || !cvUrl.startsWith(PUBLIC_PREFIX)) return null;
  const filename = cvUrl.slice(PUBLIC_PREFIX.length);
  if (!filename || filename.includes('..') || filename.includes('/')) return null;
  return `${DISK_DIR}/${filename}`;
}

/** Reads and extracts text from a candidate's already-uploaded CV, given its stored cvUrl. Returns null if unavailable. */
export async function readExistingCvText(cvUrl: string | null | undefined): Promise<string | null> {
  const diskPath = cvUrlToDiskPath(cvUrl);
  if (!diskPath) return null;
  try {
    const buf = await readFile(diskPath);
    const text = extractCvText(buf, cvUrl ?? '');
    return text.trim().length >= 40 ? text : null;
  } catch {
    return null;
  }
}
