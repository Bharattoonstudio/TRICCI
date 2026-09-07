/**
 * Shared CV helpers: text extraction from PDF/DOC buffers, and
 * mapping between the public `/airo-assets/...` CV URL and its real path on
 * disk (`/shared-storage/public/assets/...`). Used by cv-parse and the AI
 * CV-enhancement endpoints so we don't duplicate the extraction logic.
 */
import { readFile } from 'fs/promises';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

/** Extracts plain text from a PDF buffer using pdf.js (text-only, no canvas/rendering). */
export async function extractTextFromPdfBuffer(buf: Buffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += content.items.map((item: any) => item.str ?? '').join(' ') + '\n';
    }
    return fullText.replace(/\s{3,}/g, '\n').trim().slice(0, 7000);
  } catch (err) {
    console.error('[cv-text] PDF extraction failed:', err instanceof Error ? err.stack : err);
    return '';
  }
}

/** Extracts plain text from a DOC/DOCX buffer using mammoth. */
export async function extractTextFromDocBuffer(buf: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer: buf });
    console.log('[cv-text] mammoth result length:', (result.value || '').length, 'messages:', JSON.stringify(result.messages));
    return (result.value || '').replace(/\s{3,}/g, '\n').trim().slice(0, 7000);
  } catch (err) {
    console.error('[cv-text] DOC extraction failed:', err instanceof Error ? err.stack : err);
    return '';
  }
}

/** Picks the right extractor based on filename/mimetype and returns extracted text */
export async function extractCvText(buf: Buffer, filenameOrMime: string): Promise<string> {
  const isPdf = filenameOrMime.toLowerCase().includes('pdf');
  return isPdf ? extractTextFromPdfBuffer(buf) : extractTextFromDocBuffer(buf);
}

const PUBLIC_PREFIX = '/airo-assets/uploads/cvs/';
const DISK_DIR = '/shared-storage/public/assets/uploads/cvs';

/** Converts a stored `cvUrl` (public path) into its real path on disk, or null if it doesn't match */
export function cvUrlToDiskPath(cvUrl: string | null | undefined): string | null {
  if (!cvUrl || !cvUrl.startsWith(PUBLIC_PREFIX)) return null;
  const filename = cvUrl.slice(PUBLIC_PREFIX.length);
  if (!filename || filename.includes('..') || filename.includes('/')) return null;
  return `${DISK_DIR}/${filename}`;
}

/** Reads and extracts text from a candidate's already-uploaded CV, given its stored cvUrl. Returns null on failure */
export async function readExistingCvText(cvUrl: string | null | undefined): Promise<string | null> {
  const diskPath = cvUrlToDiskPath(cvUrl);
  if (!diskPath) return null;
  try {
    const buf = await readFile(diskPath);
    const text = await extractCvText(buf, cvUrl ?? '');
    return text.trim().length >= 40 ? text : null;
  } catch {
    return null;
  }
}
