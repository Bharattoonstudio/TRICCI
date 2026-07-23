/**
 * ShareButtons — reusable social sharing component for TRICCI
 *
 * Supports: WhatsApp, LinkedIn, Twitter/X, Facebook, copy-link
 * Usage:
 *   <ShareButtons url="https://tricci.in/jobs/xyz" title="Senior PM at Acme" />
 *   <ShareButtons url={...} title={...} description={...} variant="compact" />
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, Check, Share2 } from 'lucide-react';

// ── Platform definitions ──────────────────────────────────────────────────────

interface Platform {
  id: string;
  label: string;
  color: string;
  hoverColor: string;
  icon: React.FC<{ size?: number; className?: string }>;
  buildUrl: (url: string, title: string, description?: string) => string;
}

// WhatsApp SVG icon
const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// LinkedIn SVG icon
const LinkedInIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

// X (Twitter) SVG icon
const XIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Facebook SVG icon
const FacebookIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const PLATFORMS: Platform[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    hoverColor: '#1ebe5d',
    icon: WhatsAppIcon,
    buildUrl: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    color: '#0A66C2',
    hoverColor: '#0958a8',
    icon: LinkedInIcon,
    buildUrl: (url, title) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    id: 'twitter',
    label: 'X',
    color: '#000000',
    hoverColor: '#333333',
    icon: XIcon,
    buildUrl: (url, title, description) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(description ? `${title} — ${description}` : title)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    hoverColor: '#1464d8',
    icon: FacebookIcon,
    buildUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface ShareButtonsProps {
  /** Canonical URL to share */
  url: string;
  /** Primary share text / headline */
  title: string;
  /** Optional subtitle used in tweet text */
  description?: string;
  /**
   * compact — icon-only pill row (default for sidebars)
   * full    — icon + label row (for bottom-of-article)
   * inline  — small icon-only row, no labels, tight spacing
   */
  variant?: 'compact' | 'full' | 'inline';
  /** Extra Tailwind classes on the wrapper */
  className?: string;
}

export default function ShareButtons({
  url,
  title,
  description,
  variant = 'compact',
  className = '',
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for browsers that block clipboard without user gesture
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function openShare(platform: Platform) {
    const shareUrl = platform.buildUrl(url, title, description);
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
  }

  // ── Full variant (icon + label) ───────────────────────────────────────────
  if (variant === 'full') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <p className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
          <Share2 size={12} /> Share this
        </p>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => openShare(p)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-85 active:scale-95"
            style={{ backgroundColor: p.color }}
            aria-label={`Share on ${p.label}`}
          >
            <p.icon size={15} />
            {p.label}
          </button>
        ))}
        {/* Copy link */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-border bg-card text-foreground hover:bg-muted transition-colors active:scale-95"
          aria-label="Copy link"
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span key="check" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
                className="flex items-center gap-1.5 text-green-500">
                <Check size={14} /> Copied!
              </motion.span>
            ) : (
              <motion.span key="copy" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
                className="flex items-center gap-1.5">
                <Link2 size={14} /> Copy link
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    );
  }

  // ── Compact / Inline variant (icon-only pills) ────────────────────────────
  const size = variant === 'inline' ? 14 : 15;
  const btnSize = variant === 'inline' ? 'w-8 h-8' : 'w-9 h-9';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {variant === 'compact' && (
        <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:inline">Share:</span>
      )}
      {PLATFORMS.map(p => (
        <button
          key={p.id}
          onClick={() => openShare(p)}
          title={`Share on ${p.label}`}
          aria-label={`Share on ${p.label}`}
          className={`${btnSize} rounded-xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 shrink-0`}
          style={{ backgroundColor: p.color }}
        >
          <p.icon size={size} />
        </button>
      ))}
      {/* Copy link */}
      <button
        onClick={handleCopy}
        title="Copy link"
        aria-label="Copy link"
        className={`${btnSize} rounded-xl flex items-center justify-center border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-all hover:scale-110 active:scale-95 shrink-0`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
              <Check size={size} className="text-green-500" />
            </motion.span>
          ) : (
            <motion.span key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
              <Link2 size={size} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
