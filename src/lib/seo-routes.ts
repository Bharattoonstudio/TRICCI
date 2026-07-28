/**
 * Agent-editable registry of publicly-crawlable routes. Consumed by the
 * /sitemap.xml handler in src/server/entry.ts.
 *
 * Guidelines for maintaining this file:
 * - Static public paths are synced automatically from src/routes.tsx.
 * - Do not include dynamic-param routes like "/products/:id" directly.
 *   Instead, enumerate real values (e.g. "/products/desk-pro") or skip.
 * - `path` MUST start with "/".
 * - Priorities are between 0.0 and 1.0. Home = 1.0, main sections = 0.8,
 *   deep pages = 0.5.
 * - Dev-only or auth-required routes MUST NOT be listed.
 */

export interface SeoRoute {
  path: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  lastmod?: string;
  /** Exclude this route from the sitemap (e.g. auth-required or noindex pages) */
  noindex?: boolean;
}

export const seoRoutes: SeoRoute[] = [
  { path: "/", changefreq: "weekly", priority: 1.0 },
  { path: "/company", changefreq: "monthly", priority: 0.9 },
  { path: "/consultant", changefreq: "monthly", priority: 0.9 },
  { path: "/candidate", changefreq: "monthly", priority: 0.9 },
  { path: "/login", changefreq: "monthly", priority: 0.6 },
  { path: "/signup", changefreq: "monthly", priority: 0.7 },
  { path: "/verify-email", changefreq: "monthly", priority: 0.3 },
  { path: "/jobs", changefreq: "daily", priority: 0.9 },
  { path: "/about", changefreq: "monthly", priority: 0.7 },
  { path: "/founder", changefreq: "monthly", priority: 0.1 },
  { path: "/blog", changefreq: "weekly", priority: 0.8 },
  { path: "/unsubscribe", changefreq: "monthly", priority: 0.3 },
  { path: "/refresh", changefreq: "monthly", priority: 0.3 },
  { path: "/employer/dashboard", changefreq: "monthly", priority: 0.1 },
  { path: "/consultant/dashboard", changefreq: "monthly", priority: 0.1 },
  { path: "/candidate/profile", changefreq: "monthly", priority: 0.1 },
  { path: "/free-jobs", changefreq: "monthly", priority: 0.3 },
  { path: "/billing", changefreq: "monthly", priority: 0.3 },
  { path: "/admin", changefreq: "monthly", priority: 0.8 },
  { path: "/admin/login", changefreq: "monthly", priority: 0.1 },
  { path: "/admin/setup", changefreq: "monthly", priority: 0.1 },
];
