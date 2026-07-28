/**
 * TRICCI — Google Analytics 4 integration
 *
 * Architecture:
 *  - Measurement ID is fetched from /api/analytics/config (backend reads secret)
 *  - gtag script is injected only after the user accepts analytics cookies
 *  - All event helpers are no-ops when GA is not loaded (safe to call anywhere)
 *  - Page-view tracking fires on every React Router navigation
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    _ga_mid?: string; // cached measurement ID
  }
}

// ─── Load Measurement ID from backend ────────────────────────────────────────
let _midPromise: Promise<string | null> | null = null;

async function getMeasurementId(): Promise<string | null> {
  if (window._ga_mid) return window._ga_mid;
  if (_midPromise) return _midPromise;
  _midPromise = fetch('/api/analytics/config')
    .then(r => r.ok ? r.json() : null)
    .then((data: { measurementId?: string } | null) => {
      const mid = data?.measurementId ?? null;
      if (mid) window._ga_mid = mid;
      return mid;
    })
    .catch(() => null);
  return _midPromise;
}

// ─── Inject gtag script ───────────────────────────────────────────────────────
let _initialized = false;

export async function initAnalytics(): Promise<void> {
  if (_initialized || typeof window === 'undefined') return;

  const mid = await getMeasurementId();
  if (!mid) return; // no ID configured — silently skip

  _initialized = true;

  // dataLayer + gtag stub
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', mid, {
    send_page_view: false, // we fire page_view manually on route change
    anonymize_ip: true,
  });

  // Inject the gtag script tag
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${mid}`;
  document.head.appendChild(script);
}

// ─── Core gtag wrapper (safe no-op if not loaded) ─────────────────────────────
function gtag(...args: unknown[]): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

// ─── Page view ────────────────────────────────────────────────────────────────
export function trackPageView(path: string, title?: string): void {
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
  });
}

// ─── Conversion events ────────────────────────────────────────────────────────

/** User views a job listing detail page */
export function trackJobView(jobId: string, jobTitle: string, company: string): void {
  gtag('event', 'view_item', {
    event_category: 'Jobs',
    event_label: jobTitle,
    items: [{ item_id: jobId, item_name: jobTitle, item_brand: company, item_category: 'Job' }],
  });
}

/** User applies / expresses interest in a job */
export function trackJobApply(jobId: string, jobTitle: string, company: string): void {
  gtag('event', 'generate_lead', {
    event_category: 'Jobs',
    event_label: jobTitle,
    job_id: jobId,
    company,
  });
}

/** User searches jobs (search bar) */
export function trackJobSearch(query: string, resultCount: number): void {
  gtag('event', 'search', {
    search_term: query,
    result_count: resultCount,
    event_category: 'Jobs',
  });
}

/** Candidate uploads a CV */
export function trackCvUpload(source: 'profile' | 'refresh'): void {
  gtag('event', 'cv_upload', {
    event_category: 'Candidate',
    event_label: source,
  });
}

/** Candidate launches TIC AI Copilot */
export function trackAiCopilotLaunch(action: string, source: 'profile' | 'refresh'): void {
  gtag('event', 'ai_copilot_launch', {
    event_category: 'AI',
    event_label: action,
    source,
  });
}

/** User subscribes to job alerts */
export function trackJobAlertSubscribe(categories: string[]): void {
  gtag('event', 'job_alert_subscribe', {
    event_category: 'Engagement',
    event_label: categories.join(', '),
  });
}

/** Homepage CTA button clicked */
export function trackCtaClick(label: string, role: 'employer' | 'consultant' | 'candidate'): void {
  gtag('event', 'cta_click', {
    event_category: 'Conversion',
    event_label: label,
    user_role: role,
  });
}

/** Employer posts a job */
export function trackJobPost(jobTitle: string, category: string): void {
  gtag('event', 'job_post', {
    event_category: 'Employer',
    event_label: jobTitle,
    job_category: category,
  });
}

/** User signs up */
export function trackSignup(role: string, method: 'email' | 'google' | 'linkedin'): void {
  gtag('event', 'sign_up', {
    method,
    user_role: role,
  });
}

/** User logs in */
export function trackLogin(method: 'email' | 'google' | 'linkedin'): void {
  gtag('event', 'login', { method });
}

/** Social share button clicked on Refresh page */
export function trackGameShare(gameId: string, platform: string, score?: number): void {
  gtag('event', 'share', {
    method: platform,
    content_type: 'game_score',
    item_id: gameId,
    score,
  });
}
