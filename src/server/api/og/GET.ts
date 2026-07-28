/**
 * GET /api/og
 *
 * Generates a dynamic Open Graph social card as an SVG image.
 * SVG is accepted by all major social crawlers (Twitter/X, LinkedIn,
 * Facebook, Slack, WhatsApp).
 *
 * Query params:
 *   title      - Main heading (required)
 *   subtitle   - Secondary line (optional, e.g. company + location)
 *   tag        - Pill label (optional, e.g. category or "Blog")
 *   type       - "job" | "blog" | "default" (controls accent colour)
 */

import type { Request, Response } from 'express';

const BRAND_PRIMARY = '#FF6B35';
const BRAND_SECONDARY = '#FFD035';
const BRAND_ACCENT = '#35C9FF';
const BG_DARK = '#1A0A00';
const BG_CARD = '#2A1200';

const TYPE_COLORS: Record<string, string> = {
  job: BRAND_PRIMARY,
  blog: BRAND_ACCENT,
  default: BRAND_SECONDARY,
  technology: BRAND_ACCENT,
  product: BRAND_PRIMARY,
  data: '#a78bfa',
  sales: BRAND_SECONDARY,
  marketing: '#34d399',
  finance: '#60a5fa',
  other: BRAND_PRIMARY,
};

/** Escape XML special chars so arbitrary text is safe inside SVG */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Naive word-wrap: split text into lines of at most `maxChars` characters,
 * breaking on spaces. Returns an array of line strings.
 */
function wordWrap(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + (current ? ' ' : '') + word).length <= maxChars) {
      current += (current ? ' ' : '') + word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function handler(req: Request, res: Response) {
  const rawTitle = String(req.query.title ?? 'TRICCI').slice(0, 120);
  const rawSubtitle = String(req.query.subtitle ?? '').slice(0, 100);
  const rawTag = String(req.query.tag ?? '').slice(0, 40);
  const type = String(req.query.type ?? 'default').toLowerCase();

  const accentColor = TYPE_COLORS[type] ?? BRAND_PRIMARY;

  // Word-wrap title into ≤2 lines of ≤38 chars each
  const titleLines = wordWrap(rawTitle, 38).slice(0, 2);
  const titleFontSize = titleLines.some(l => l.length > 28) ? 52 : 60;

  // Subtitle: single line, truncated
  const subtitle = rawSubtitle.length > 70 ? rawSubtitle.slice(0, 67) + '…' : rawSubtitle;

  // Build title <text> elements
  const titleY0 = rawSubtitle ? 260 : 290;
  const titleLineHeight = titleFontSize + 12;
  const titleSvg = titleLines
    .map((line, i) =>
      `<text x="80" y="${titleY0 + i * titleLineHeight}" font-family="'Space Grotesk', 'Inter', Arial, sans-serif" font-size="${titleFontSize}" font-weight="800" fill="#FFFFFF" letter-spacing="-1">${esc(line)}</text>`,
    )
    .join('\n    ');

  const subtitleY = titleY0 + titleLines.length * titleLineHeight + 20;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${BG_DARK}"/>
      <stop offset="100%" stop-color="${BG_CARD}"/>
    </linearGradient>
    <!-- Accent glow -->
    <radialGradient id="glow" cx="900" cy="120" r="400" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${BG_DARK}" stop-opacity="0"/>
    </radialGradient>
    <!-- Bottom bar gradient -->
    <linearGradient id="bar" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${BRAND_PRIMARY}"/>
      <stop offset="50%" stop-color="${BRAND_SECONDARY}"/>
      <stop offset="100%" stop-color="${BRAND_ACCENT}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Decorative grid lines -->
  <g stroke="#FF6B35" stroke-opacity="0.06" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105"/>
    <line x1="0" y1="210" x2="1200" y2="210"/>
    <line x1="0" y1="315" x2="1200" y2="315"/>
    <line x1="0" y1="420" x2="1200" y2="420"/>
    <line x1="0" y1="525" x2="1200" y2="525"/>
    <line x1="200" y1="0" x2="200" y2="630"/>
    <line x1="400" y1="0" x2="400" y2="630"/>
    <line x1="600" y1="0" x2="600" y2="630"/>
    <line x1="800" y1="0" x2="800" y2="630"/>
    <line x1="1000" y1="0" x2="1000" y2="630"/>
  </g>

  <!-- Large watermark TRICCI -->
  <text x="600" y="420" text-anchor="middle" font-family="'Space Grotesk', Arial, sans-serif" font-size="260" font-weight="900" fill="#FFFFFF" fill-opacity="0.025" letter-spacing="-8">TRICCI</text>

  <!-- Accent circle top-right -->
  <circle cx="1100" cy="80" r="180" fill="${accentColor}" fill-opacity="0.07"/>
  <circle cx="1100" cy="80" r="100" fill="${accentColor}" fill-opacity="0.06"/>

  <!-- Tag pill -->
  ${rawTag ? `
  <rect x="80" y="190" width="${Math.min(rawTag.length * 13 + 32, 280)}" height="36" rx="18" fill="${accentColor}" fill-opacity="0.15"/>
  <rect x="80" y="190" width="${Math.min(rawTag.length * 13 + 32, 280)}" height="36" rx="18" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.5"/>
  <text x="96" y="213" font-family="'Inter', Arial, sans-serif" font-size="15" font-weight="700" fill="${accentColor}" letter-spacing="1" text-transform="uppercase">${esc(rawTag.toUpperCase())}</text>
  ` : ''}

  <!-- Title -->
  ${titleSvg}

  <!-- Subtitle -->
  ${subtitle ? `<text x="80" y="${subtitleY}" font-family="'Inter', Arial, sans-serif" font-size="28" font-weight="400" fill="#FFFFFF" fill-opacity="0.55">${esc(subtitle)}</text>` : ''}

  <!-- Bottom bar -->
  <rect x="0" y="610" width="1200" height="20" fill="url(#bar)"/>

  <!-- TRICCI logo wordmark bottom-left -->
  <text x="80" y="575" font-family="'Space Grotesk', Arial, sans-serif" font-size="32" font-weight="900" fill="${BRAND_PRIMARY}" letter-spacing="3">TRICCI</text>
  <text x="80" y="598" font-family="'Inter', Arial, sans-serif" font-size="16" font-weight="400" fill="#FFFFFF" fill-opacity="0.4" letter-spacing="1">tricci.in · India's Recruitment Marketplace</text>

  <!-- Domain badge bottom-right -->
  <rect x="980" y="548" width="160" height="40" rx="8" fill="${BRAND_PRIMARY}" fill-opacity="0.12"/>
  <rect x="980" y="548" width="160" height="40" rx="8" fill="none" stroke="${BRAND_PRIMARY}" stroke-width="1" stroke-opacity="0.4"/>
  <text x="1060" y="573" text-anchor="middle" font-family="'Inter', Arial, sans-serif" font-size="15" font-weight="600" fill="${BRAND_PRIMARY}">tricci.in</text>
</svg>`;

  res
    .set('Content-Type', 'image/svg+xml')
    .set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600')
    .send(svg);
}
