import express, { type NextFunction, type Request, type Response } from "express";
import { fileURLToPath } from "node:url";
import { dirname, extname, join } from "node:path";
import { readFileSync } from "node:fs";

// <api-imports>
import admin_assessments_get_0 from "./api/admin/assessments/GET";
import admin_create_admin_post_1 from "./api/admin/create-admin/POST";
import admin_jobs_get_2 from "./api/admin/jobs/GET";
import admin_jobs_id_put_3 from "./api/admin/jobs/[id]/PUT";
import admin_placements_get_4 from "./api/admin/placements/GET";
import admin_purge_mock_jobs_post_5 from "./api/admin/purge-mock-jobs/POST";
import admin_scorecards_get_6 from "./api/admin/scorecards/GET";
import admin_seed_demo_post_7 from "./api/admin/seed-demo/POST";
import admin_stats_get_8 from "./api/admin/stats/GET";
import admin_submissions_get_9 from "./api/admin/submissions/GET";
import admin_submissions_id_status_put_10 from "./api/admin/submissions/[id]/status/PUT";
import admin_users_get_11 from "./api/admin/users/GET";
import admin_users_id_get_12 from "./api/admin/users/[id]/GET";
import admin_users_id_suspend_post_13 from "./api/admin/users/[id]/suspend/POST";
import admin_users_id_unsuspend_post_14 from "./api/admin/users/[id]/unsuspend/POST";
import alerts_subscribe_post_15 from "./api/alerts/subscribe/POST";
import alerts_unsubscribe_delete_16 from "./api/alerts/unsubscribe/DELETE";
import analytics_config_get_17 from "./api/analytics/config/GET";
import auth_welcome_post_18 from "./api/auth/welcome/POST";
import auth_action_get_19 from "./api/auth/[action]/GET";
import auth_action_post_20 from "./api/auth/[action]/POST";
import auth_action_detail_get_21 from "./api/auth/[action]/[detail]/GET";
import auth_action_detail_post_22 from "./api/auth/[action]/[detail]/POST";
import candidate_applications_get_23 from "./api/candidate/applications/GET";
import candidate_cv_parse_post_24, { multerMiddleware as candidate_cv_parse_post_24_upload } from "./api/candidate/cv-parse/POST";
import candidate_cv_enhance_post from "./api/candidate/cv-enhance/POST";
import candidate_cv_enhance_pdf_post from "./api/candidate/cv-enhance/pdf/POST";
import candidate_match_score_post from "./api/candidate/match-score/POST";
import communication_log_get from "./api/communication-log/GET";
import communication_log_post from "./api/communication-log/POST";
import admin_audit_log_get from "./api/admin/audit-log/GET";
import candidate_cv_upload_post_25, { multerMiddleware as candidate_cv_upload_post_25_upload } from "./api/candidate/cv-upload/POST";
import candidate_profile_get_26 from "./api/candidate/profile/GET";
import candidate_profile_put_27 from "./api/candidate/profile/PUT";
import commission_config_get_28 from "./api/commission/config/GET";
import commission_config_put_29 from "./api/commission/config/PUT";
import consultant_agreement_get_30 from "./api/consultant/agreement/GET";
import consultant_agreement_post_31 from "./api/consultant/agreement/POST";
import consultant_analytics_get_32 from "./api/consultant/analytics/GET";
import consultant_onboarding_reminder_post_33 from "./api/consultant/onboarding/reminder/POST";
import consultant_submissions_get_34 from "./api/consultant/submissions/GET";
import employer_applications_get_35 from "./api/employer/applications/GET";
import employer_applications_id_status_put_36 from "./api/employer/applications/[id]/status/PUT";
import employer_assessments_get_37 from "./api/employer/assessments/GET";
import employer_assessments_post_38 from "./api/employer/assessments/POST";
import employer_profile_get_39 from "./api/employer/profile/GET";
import employer_profile_put_40 from "./api/employer/profile/PUT";
import employer_scorecards_get_41 from "./api/employer/scorecards/GET";
import employer_scorecards_post_42 from "./api/employer/scorecards/POST";
import employer_submissions_get_43 from "./api/employer/submissions/GET";
import health_get_44 from "./api/health/GET";
import jobs_get_45 from "./api/jobs/GET";
import jobs_post_46 from "./api/jobs/POST";
import jobs_aggregate_get_47 from "./api/jobs/aggregate/GET";
import jobs_parse_jd_post_48 from "./api/jobs/parse-jd/POST";
import jobs_id_get_49 from "./api/jobs/[id]/GET";
import jobs_id_apply_post_50 from "./api/jobs/[id]/apply/POST";
import og_get_51 from "./api/og/GET";
import otp_send_post_52 from "./api/otp/send/POST";
import otp_send_public_post_53 from "./api/otp/send-public/POST";
import otp_verify_post_54 from "./api/otp/verify/POST";
import otp_verify_public_post_55 from "./api/otp/verify-public/POST";
import payments_create_order_post_56 from "./api/payments/create-order/POST";
import payments_mode_get_57 from "./api/payments/mode/GET";
import payments_verify_payment_post_58 from "./api/payments/verify-payment/POST";
import payments_wallet_get_59 from "./api/payments/wallet/GET";
import submissions_post_60, { multerMiddleware as submissions_post_60_upload } from "./api/submissions/POST";
import submissions_id_status_put_61 from "./api/submissions/[id]/status/PUT";
// </api-imports>
import { seoRoutes } from "../lib/seo-routes";
import { isSystemHost } from "./seo-host";
import { otpSendRateLimiter, otpVerifyRateLimiter, setupRateLimitCleanup } from "./auth-rate-limit";

function normalizeCommerceApiBaseUrlEnv() {
	if (process.env.GODADDY_API_BASE_URL) return;
	const hostOnly = process.env.VITE_GODADDY_API_HOST;
	if (!hostOnly) return;
	const normalizedHost = hostOnly.replace(/^https?:\/\//, "").trim();
	if (!normalizedHost) return;
	process.env.GODADDY_API_BASE_URL = `https://${normalizedHost}`;
}

normalizeCommerceApiBaseUrlEnv();

import multer from "multer";
// Shared multer instance — used by file-upload routes (CV, PDF, etc.)
export const multerMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();

// Honour x-forwarded-* from the load balancer so req.protocol/req.hostname
// reflect the public-facing values. Express-maintained parsing respects the
// existing trust-proxy config; direct header reads would let a client spoof
// the sitemap origin in robots.txt.
app.set("trust proxy", true);

// ── Security headers ──────────────────────────────────────────────────────────
// Applied to every response before any route handler runs.
app.use((_req, res, next) => {
	res.set("X-Content-Type-Options", "nosniff");
	res.set("X-Frame-Options", "SAMEORIGIN");
	res.set("Referrer-Policy", "strict-origin-when-cross-origin");
	res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
	// NOTE: CSP is set via <meta> in index.html instead of a header,
	// because the CDN/proxy layer overrides response headers with default-src 'none'.
	// The <meta> tag is read by the browser directly and cannot be overridden by the CDN.
	next();
});
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// <api-registrations>
app.get("/api/admin/assessments", admin_assessments_get_0);
app.post("/api/admin/create-admin", admin_create_admin_post_1);
app.get("/api/admin/jobs", admin_jobs_get_2);
app.put("/api/admin/jobs/:id", admin_jobs_id_put_3);
app.get("/api/admin/placements", admin_placements_get_4);
app.post("/api/admin/purge-mock-jobs", admin_purge_mock_jobs_post_5);
app.get("/api/admin/scorecards", admin_scorecards_get_6);
app.post("/api/admin/seed-demo", admin_seed_demo_post_7);
app.get("/api/admin/stats", admin_stats_get_8);
app.get("/api/admin/submissions", admin_submissions_get_9);
app.put("/api/admin/submissions/:id/status", admin_submissions_id_status_put_10);
app.get("/api/admin/users", admin_users_get_11);
app.get("/api/admin/users/:id", admin_users_id_get_12);
app.post("/api/admin/users/:id/suspend", admin_users_id_suspend_post_13);
app.post("/api/admin/users/:id/unsuspend", admin_users_id_unsuspend_post_14);
app.post("/api/alerts/subscribe", alerts_subscribe_post_15);
app.delete("/api/alerts/unsubscribe", alerts_unsubscribe_delete_16);
app.get("/api/analytics/config", analytics_config_get_17);
app.post("/api/auth/welcome", auth_welcome_post_18);
app.get("/api/auth/:action", auth_action_get_19);
app.post("/api/auth/:action", auth_action_post_20);
app.get("/api/auth/:action/:detail", auth_action_detail_get_21);
app.post("/api/auth/:action/:detail", auth_action_detail_post_22);
app.get("/api/candidate/applications", candidate_applications_get_23);
app.post("/api/candidate/cv-parse", candidate_cv_parse_post_24_upload, candidate_cv_parse_post_24);
app.post("/api/candidate/cv-enhance", candidate_cv_enhance_post);
app.post("/api/candidate/cv-enhance/pdf", candidate_cv_enhance_pdf_post);
app.post("/api/candidate/match-score", candidate_match_score_post);
app.get("/api/communication-log", communication_log_get);
app.post("/api/communication-log", communication_log_post);
app.get("/api/admin/audit-log", admin_audit_log_get);
app.post("/api/candidate/cv-upload", candidate_cv_upload_post_25_upload, candidate_cv_upload_post_25);
app.get("/api/candidate/profile", candidate_profile_get_26);
app.put("/api/candidate/profile", candidate_profile_put_27);
app.get("/api/commission/config", commission_config_get_28);
app.put("/api/commission/config", commission_config_put_29);
app.get("/api/consultant/agreement", consultant_agreement_get_30);
app.post("/api/consultant/agreement", consultant_agreement_post_31);
app.get("/api/consultant/analytics", consultant_analytics_get_32);
app.post("/api/consultant/onboarding/reminder", consultant_onboarding_reminder_post_33);
app.get("/api/consultant/submissions", consultant_submissions_get_34);
app.get("/api/employer/applications", employer_applications_get_35);
app.put("/api/employer/applications/:id/status", employer_applications_id_status_put_36);
app.get("/api/employer/assessments", employer_assessments_get_37);
app.post("/api/employer/assessments", employer_assessments_post_38);
app.get("/api/employer/profile", employer_profile_get_39);
app.put("/api/employer/profile", employer_profile_put_40);
app.get("/api/employer/scorecards", employer_scorecards_get_41);
app.post("/api/employer/scorecards", employer_scorecards_post_42);
app.get("/api/employer/submissions", employer_submissions_get_43);
app.get("/api/health", health_get_44);
app.get("/api/jobs", jobs_get_45);
app.post("/api/jobs", jobs_post_46);
app.get("/api/jobs/aggregate", jobs_aggregate_get_47);
app.post("/api/jobs/parse-jd", jobs_parse_jd_post_48);
app.get("/api/jobs/:id", jobs_id_get_49);
app.post("/api/jobs/:id/apply", jobs_id_apply_post_50);
app.get("/api/og", og_get_51);
app.post("/api/otp/send", otpSendRateLimiter, otp_send_post_52);
app.post("/api/otp/send-public", otpSendRateLimiter, otp_send_public_post_53);
app.post("/api/otp/verify", otpVerifyRateLimiter, otp_verify_post_54);
app.post("/api/otp/verify-public", otpVerifyRateLimiter, otp_verify_public_post_55);
app.post("/api/payments/create-order", payments_create_order_post_56);
app.get("/api/payments/mode", payments_mode_get_57);
app.post("/api/payments/verify-payment", payments_verify_payment_post_58);
app.get("/api/payments/wallet", payments_wallet_get_59);
app.post("/api/submissions", submissions_post_60_upload, submissions_post_60);
app.put("/api/submissions/:id/status", submissions_id_status_put_61);
// </api-registrations>

// Setup rate limiting cleanup interval
setupRateLimitCleanup();
console.log('[Security] Rate limit cleanup initialized');

// Run DB migrations at startup
import("./db/migrations/commission_config.js").then(m => m.migrateCommissionConfig()).catch(console.error);
import("./db/migrations/admin_visibility.js").then(m => m.migrateAdminVisibility()).catch(console.error);
import("./db/migrations/interview_rounds.js").then(m => m.migrateInterviewRounds()).catch(console.error);
import("./db/migrations/consultant_agreement.js").then(m => m.migrateConsultantAgreement()).catch(console.error);
import("./db/migrations/consultant_reminder_sent_at.js").then(m => m.up()).catch(console.error);
import("./db/migrations/candidate_application.js").then(m => m.migrateCandidateApplication()).catch(console.error);
import("./db/migrations/candidate_cv_columns.js").then(m => m.migrateCandidateCvColumns()).catch(console.error).then(() => console.log('[migration] candidate_cv_columns: runner finished'));
import("./db/migrations/candidate_application_cv_columns.js").then(m => m.migrateCandidateApplicationCvColumns()).catch(console.error);
import("./db/migrations/quick_wins_batch1.js").then(m => m.migrateQuickWinsBatch1()).catch(console.error);
import("./db/migrations/assessments_scorecards.js").then(m => m.migrateAssessmentsAndScorecards()).catch(console.error);
import("./db/migrations/indexes.js").then(m => m.migrateIndexes()).catch(console.error);
import("./db/migrations/placements.js").then(m => m.migratePlacements()).catch(console.error);
import("./db/migrations/wallet.js").then(m => m.migrateWallet()).catch(console.error);

// Error middleware must be registered AFTER the routes it protects; Express
// only passes errors to middleware defined later in the stack.
app.use("/api", (err: unknown, req: Request, res: Response, _next: NextFunction) => {
	// Always respond JSON on /api so clients parsing response.json() don't
	// receive Express's default HTML error page for non-Error throws.
	console.error("ssr.api.error", {
		url: req.url,
		error: err instanceof Error ? err.stack : String(err),
	});
	res.status(500).json({ error: "Internal server error" });
});

function baseUrl(req: Request): string {
	return `${req.protocol}://${req.hostname}`;
}

function escapeXml(s: string): string {
	return s.replace(/[&<>"']/g, (c) =>
		({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!,
	);
}

app.get("/robots.txt", (req, res) => {
	if (isSystemHost(req)) {
		res
			.type("text/plain")
			.set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host")
			.send("User-agent: *\nDisallow: /\n");
		return;
	}
	const base = baseUrl(req);
	const body = [
		"User-agent: *",
		"Allow: /",
		"",
		`Sitemap: ${base}/sitemap.xml`,
		"",
	].join("\n");
	res.type("text/plain").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send(body);
});

app.get("/sitemap.xml", (req, res) => {
	if (isSystemHost(req)) {
		const empty = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>\n`;
		res.type("application/xml").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send(empty);
		return;
	}
	const base = baseUrl(req);
	const urls = seoRoutes
		.filter((r) => typeof r.path === "string" && r.path.startsWith("/") && !r.noindex)
		.map((r) => {
			const loc = `${base}${r.path}`;
			const parts = [`    <loc>${escapeXml(loc)}</loc>`];
			if (r.lastmod) parts.push(`    <lastmod>${escapeXml(r.lastmod)}</lastmod>`);
			if (r.changefreq) parts.push(`    <changefreq>${r.changefreq}</changefreq>`);
			if (r.priority !== undefined)
				parts.push(`    <priority>${r.priority.toFixed(1)}</priority>`);
			return `  <url>\n${parts.join("\n")}\n  </url>`;
		})
		.join("\n");
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
	res.type("application/xml").set("Cache-Control", "public, max-age=60, must-revalidate").set("Vary", "Host").send(body);
});

if (import.meta.env.PROD) {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	const clientDir = join(__dirname, "client");

	app.use(
		express.static(clientDir, {
			index: false,
			setHeaders(res, filePath) {
				res.set(
					"Cache-Control",
					filePath.includes("/assets/")
						? "public, max-age=31536000, immutable"
						: "no-cache",
				);
			},
		}),
	);

	app.use((_req, res, next) => {
		res.set("Cache-Control", "no-cache");
		next();
	});

	let template: string;
	try {
		template = readFileSync(join(clientDir, "index.html"), "utf-8");
	} catch (err) {
		console.error("ssr.template.load-failed", {
			path: join(clientDir, "index.html"),
			error: err instanceof Error ? err.message : String(err),
		});
		process.exit(1);
	}
	if (!template.includes("<!--app-head-->") || !template.includes("<!--app-html-->")) {
		// Fail fast at boot, same as a template load failure above: without
		// markers, every .replace() call on the render path is a no-op and we
		// would serve a shell with no <head> content and no rendered body on
		// every request. Preferring process.exit over a degraded mode ensures
		// an operator notices and fixes the build rather than serving broken
		// SEO-invisible pages indefinitely.
		console.error("ssr.template.markers-missing", {
			hasHead: template.includes("<!--app-head-->"),
			hasHtml: template.includes("<!--app-html-->"),
		});
		process.exit(1);
	}
	const fallbackShell = template
		.replace("<!--app-head-->", "")
		.replace("<!--app-html-->", "");

	// Resolve the SSR module once into a stable render function. A failed
	// load is unrecoverable at runtime - exiting lets the container
	// scheduler restart with a clean slate rather than leaving the server
	// to serve silent 503s indefinitely against a single startup log.
	type RenderResult = {
		html: string;
		head: string;
		status: number;
		redirect?: string;
	};
	let renderFn: ((url: string) => Promise<RenderResult>) | null = null;
	const SSR_MODULE_LOAD_TIMEOUT_MS = 30_000;
	const loadTimeout = setTimeout(() => {
		if (renderFn !== null) return;
		console.error("ssr.module.load-timeout", {
			timeoutMs: SSR_MODULE_LOAD_TIMEOUT_MS,
		});
		process.exit(1);
	}, SSR_MODULE_LOAD_TIMEOUT_MS);
	loadTimeout.unref();
	import("../entry-server").then(
		(mod) => {
			clearTimeout(loadTimeout);
			renderFn = mod.render;
		},
		(err) => {
			clearTimeout(loadTimeout);
			console.error("ssr.module.load-failed", {
				error: err instanceof Error ? err.stack : String(err),
			});
			process.exit(1);
		},
	);

	app.get(/.*/, async (req, res, next) => {
		if (req.method !== "GET") return next();
		if (req.path.startsWith("/api")) return next();
		if (extname(req.path)) return next();
		const sendFallback = () =>
			res
				.status(503)
				.set("Content-Type", "text/html; charset=utf-8")
				.set("Cache-Control", "no-store")
				.send(fallbackShell);
		if (renderFn === null) {
			// Module not yet resolved; fall back without logging to avoid startup
			// noise before the first render is even possible. A terminal load
			// failure (import reject or 30s timeout) process.exit(1)s from the
			// loader above, so this branch is only the brief warmup window.
			return sendFallback();
		}
		try {
			const result = await renderFn(req.url);
			if (result.redirect) {
				// Redirect thrown from a loader/action surfaces as a Response.
				// Forward it so the browser actually navigates to the new URL
				// instead of seeing an empty shell with a stale status.
				res.redirect(result.status, result.redirect);
				return;
			}
			if (!result.html) {
				// A non-redirect Response was thrown from a loader (e.g.
				// `throw new Response(null, { status: 404 })`). renderToString
				// produced no markup, so we have a real status but no body.
				// Log so the case is observable in ops dashboards, and mark
				// no-store so CDNs don't cache an empty page as a valid hit.
				// User-visible 404 / error pages should come from a route
				// errorElement, not from this fallback path.
				console.error("ssr.render.error-response", {
					url: req.url,
					status: result.status,
				});
				res
					.status(result.status)
					.set("Content-Type", "text/html; charset=utf-8")
					.set("Cache-Control", "no-store")
					.send(fallbackShell);
				return;
			}
			// Per-host SEO injection. System URLs get a noindex meta so
			// crawlers drop them from the index over time; customer-attached
			// hosts get a self-canonical link so search engines treat them
			// as authoritative for the rendered content.
			const seoHead = isSystemHost(req)
				? `<meta name="robots" content="noindex,nofollow">`
				: `<link rel="canonical" href="${escapeXml(`${req.protocol}://${req.hostname}${req.path}`)}">`;
			// Function replacements disable String.replace's $-special sequences
			// ($&, $', $`, $$) so user-authored titles / JSON-LD like
			// "Save $& today" insert literally instead of being interpolated.
			const out = template
				.replace("<!--app-head-->", () => seoHead + result.head)
				.replace("<!--app-html-->", () => result.html);
			res
				.status(result.status)
				.set("Content-Type", "text/html; charset=utf-8")
				.set("Cache-Control", "no-cache")
				.send(out);
		} catch (err) {
			// 503 surfaces the failure in CDN/monitoring without caching a broken
			// page as success. console.error (not warn) puts it at the right log
			// level for the observability pipeline to alert on.
			console.error("ssr.render.failed", {
				url: req.url,
				// Log the full stack — React's renderToString annotates it with
				// the failing component's call tree, which the message alone
				// discards.
				error: err instanceof Error ? err.stack : String(err),
			});
			sendFallback();
		}
	});

	const shutdown = async (signal: string) => {
		console.log(`Got ${signal}, shutting down gracefully...`);
		// Scope the ERR_MODULE_NOT_FOUND suppression to the import() only.
		// A closeConnection() failure that happens to carry the same code
		// (unlikely but possible for wrapped errors) must not be silently
		// swallowed - it indicates a real db-close failure worth logging.
		let mod: { closeConnection?: () => Promise<void> | void } | null = null;
		try {
			const dbClient = "./db/client" + ".js";
			mod = await import(/* @vite-ignore */ dbClient);
		} catch (error: unknown) {
			const code = (error as { code?: string } | null)?.code;
			if (code !== "ERR_MODULE_NOT_FOUND") {
				console.error("ssr.shutdown.db-import-failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		if (mod && typeof mod.closeConnection === "function") {
			try {
				await mod.closeConnection();
				console.log("Database connections closed");
			} catch (error: unknown) {
				console.error("ssr.shutdown.db-close-failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		process.exit(0);
	};

	(["SIGTERM", "SIGINT"] as const).forEach((signal) => {
		process.once(signal, () => {
			void shutdown(signal);
		});
	});

	const rawPort = process.env.PORT || "3000";
	const port = parseInt(rawPort, 10);
	if (!Number.isInteger(port) || port <= 0 || port > 65535) {
		// parseInt("abc") returns NaN; passing that to app.listen throws
		// synchronously before the server.on("error") handler below can catch
		// it. Fail fast with an actionable log rather than a cryptic crash.
		console.error("ssr.server.invalid-port", { rawPort });
		process.exit(1);
	}
	const host = process.env.HOST || "0.0.0.0";
	const server = app.listen(port, host, () => {
		console.log(`Server listening on http://${host}:${port}`);
	});
	server.on("error", (err: NodeJS.ErrnoException) => {
		console.error("ssr.server.listen-failed", {
			port,
			host,
			code: err.code,
			error: err.message,
		});
		process.exit(1);
	});
}

export default app;

// ── Exported helpers (used by entry.test.ts) ──────────────────────────────────

export function renderSsrDocument(
  template: string,
  result: { head: string; html: string },
  opts: { scriptHtml: string },
): string {
  const headContent = opts.scriptHtml
    ? result.head + '\n' + opts.scriptHtml
    : result.head;
  return template
    .replace('<!--app-head-->', () => headContent)
    .replace('<!--app-html-->', () => result.html);
}

export function registerAdSenseTextRoutes(
  expressApp: import('express').Express,
  opts: { publisherId: string | null; scriptHtml: string; adsTxt: string | null; appAdsTxt: string | null },
): void {
  expressApp.get('/ads.txt', (_req, res) => {
    res.type('text/plain').set('Cache-Control', 'no-cache');
    if (opts.adsTxt) {
      res.status(200).send(opts.adsTxt);
    } else {
      res.status(404).send('');
    }
  });
  expressApp.get('/app-ads.txt', (_req, res) => {
    res.type('text/plain').set('Cache-Control', 'no-cache');
    if (opts.appAdsTxt) {
      res.status(200).send(opts.appAdsTxt);
    } else {
      res.status(404).send('');
    }
  });
}
