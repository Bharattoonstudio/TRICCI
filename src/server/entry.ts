import path from "path";
import { fileURLToPath } from "url";
import express, { type Request, Response, NextFunction } from "express";
import { createMiddleware } from "better-auth/express";
import { auth } from "@/server/lib/auth/auth.js";
import type { ViteDevServer } from "vite";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
	const isDev = process.env.NODE_ENV === "development";
	let vite: ViteDevServer | undefined;

	// ─────────────────────────────────────────────────────────────────────────────
	// Vite Dev Server (only in development)
	// ─────────────────────────────────────────────────────────────────────────────
	if (isDev) {
		const { createServer } = await import("vite");
		vite = await createServer({
			appType: "custom",
			server: { middlewareMode: true },
		});
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// Express Setup
	// ─────────────────────────────────────────────────────────────────────────────
	const app = express();
	const port = process.env.PORT || 3000;

	// ─────────────────────────────────────────────────────────────────────────────
	// Body Parsing Middleware
	// ─────────────────────────────────────────────────────────────────────────────
	app.use(express.json({ limit: "50mb" }));
	app.use(express.urlencoded({ extended: true, limit: "50mb" }));

	// ─────────────────────────────────────────────────────────────────────────────
	// Trust Proxy (for Railway / Cloud Deployments)
	// ─────────────────────────────────────────────────────────────────────────────
	app.set("trust proxy", 1);

	// ── COMPREHENSIVE SECURITY HEADERS ────────────────────────────────────────────
	// Applied to every response before any route handler runs.
	app.use((_req, res, next) => {
		// Prevent MIME type sniffing
		res.set("X-Content-Type-Options", "nosniff");
		
		// Prevent clickjacking attacks
		res.set("X-Frame-Options", "DENY");
		
		// Prevent XSS attacks (legacy header, modern browsers use CSP)
		res.set("X-XSS-Protection", "1; mode=block");
		
		// Control referrer policy
		res.set("Referrer-Policy", "strict-origin-when-cross-origin");
		
		// Disable dangerous APIs
		res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
		
		// Force HTTPS (HSTS)
		res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
		
		// Content Security Policy - prevents XSS and injection attacks
		res.set(
			"Content-Security-Policy",
			"default-src 'self'; " +
			"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
			"font-src 'self' https://fonts.gstatic.com; " +
			"img-src 'self' data: https:; " +
			"connect-src 'self' https:; " +
			"frame-ancestors 'none'; " +
			"base-uri 'self'; " +
			"form-action 'self'"
		);
		
		// Remove server identification headers (prevent fingerprinting)
		res.removeHeader("Server");
		res.removeHeader("X-Powered-By");
		
		// Add request ID for security monitoring
		res.set("X-Request-ID", `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
		
		next();
	});
	// ─────────────────────────────────────────────────────────────────────────────

	// ─────────────────────────────────────────────────────────────────────────────
	// BetterAuth Middleware
	// ─────────────────────────────────────────────────────────────────────────────
	app.use(createMiddleware(auth));

	// ─────────────────────────────────────────────────────────────────────────────
	// API Routes
	// ─────────────────────────────────────────────────────────────────────────────
	const apiDir = path.join(__dirname, "api");

	// Recursively load all API route files
	async function loadApiRoutes(dir: string, basePath = "") {
		const files = fs.readdirSync(dir);

		for (const file of files) {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);

			if (stat.isDirectory()) {
				// Recurse into subdirectories
				await loadApiRoutes(filePath, basePath + "/" + file);
			} else if (file.endsWith(".ts") && file !== "index.ts") {
				// Extract HTTP method and path
				const httpMethod = file.split(".").slice(-2, -1)[0].toLowerCase();
				if (!["get", "post", "put", "patch", "delete"].includes(httpMethod)) continue;

				const routePath = basePath + "/" + file.replace(/\.[^/.]+$/, "").replace(/\/[A-Z]/g, (m) => `/:${m.slice(1).toLowerCase()}`);

				try {
					const module = await import(filePath);
					const handler = module.default;

					if (handler) {
						app[httpMethod as "get" | "post" | "put" | "patch" | "delete"](`/api${routePath}`, handler);
						console.log(`[API] ${httpMethod.toUpperCase()} /api${routePath}`);
					}
				} catch (err) {
					console.error(`Failed to load API route ${filePath}:`, err);
				}
			}
		}
	}

	await loadApiRoutes(apiDir);

	// ─────────────────────────────────────────────────────────────────────────────
	// Vite Middleware (Development Only)
	// ─────────────────────────────────────────────────────────────────────────────
	if (vite) {
		app.use(vite.middlewares);
	}

	// ─────────────────────────────────────────────────────────────────────────────
	// SSR Middleware (Production & Development)
	// ─────────────────────────────────────────────────────────────────────────────
	app.use(async (req: Request, res: Response, next: NextFunction) => {
		try {
			const url = req.originalUrl;

			// Determine the template path
			const templatePath = path.resolve(__dirname, "..", "index.html");

			// Read template
			let template = fs.readFileSync(templatePath, "utf-8");

			// Transform template in development
			if (vite) {
				template = await vite.transformIndexHtml(url, template);
			}

			// Render app (using Vite's SSR module in production)
			let appHtml = "";
			if (isDev) {
				// In development, vite handles it
				appHtml = "<!-- Vite SSR will render here -->";
			} else {
				// In production, we'd need to handle SSR properly
				// For now, we return the template as-is
				appHtml = "<!-- Client-side rendering -->";
			}

			// Replace placeholder
			const html = template.replace(`<!--ssr-outlet-->`, appHtml);

			// Send response
			res.status(200).set({ "Content-Type": "text/html" }).end(html);
		} catch (e) {
			if (e instanceof Error) {
				console.error(`[SSR Error] ${e.message}`);
				res.status(500).end(e.message);
			} else {
				console.error(`[SSR Error] Unknown error`);
				res.status(500).end("Internal Server Error");
			}
		}
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Error Handler (Last Middleware)
	// ─────────────────────────────────────────────────────────────────────────────
	app.use((err: Error, _req: Request, res: Response) => {
		console.error("[Server Error]", err);
		res.status(500).json({ error: "Internal Server Error" });
	});

	// ─────────────────────────────────────────────────────────────────────────────
	// Start Server
	// ─────────────────────────────────────────────────────────────────────────────
	app.listen(port, () => {
		console.log(`Server running on http://localhost:${port}`);
		console.log(`Environment: ${isDev ? "development" : "production"}`);
	});
}

startServer().catch(console.error);
