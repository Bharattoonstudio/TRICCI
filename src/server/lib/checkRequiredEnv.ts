/**
 * Startup-time check for required third-party API keys.
 *
 * All 4 AI-powered features (CV Enhancer, Match Score, CV auto-parse, and
 * CV Bank AI parse) are written to degrade gracefully when OPENAI_API_KEY
 * is missing — each just returns `{ reason: 'no_key' }` instead of crashing
 * or blocking the candidate/consultant's underlying flow (upload, apply,
 * submit). That's the right behavior for resilience, but it has a downside:
 * a missing key produces no error anywhere except inside individual API
 * response bodies, so all four AI features can silently stop working in
 * production with nothing surfacing the problem. This logs one unmissable
 * warning at boot so a misconfigured environment is caught immediately in
 * deploy logs, instead of being discovered by accident during manual
 * testing (as happened here).
 */
export function checkRequiredEnv(): void {
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      '\n⚠️  ⚠️  ⚠️  OPENAI_API_KEY is not set — AI features are DISABLED  ⚠️  ⚠️  ⚠️\n' +
      'Affected: AI CV Enhancer, AI Match Score, candidate CV auto-parse, ' +
      'consultant CV Bank AI parse.\n' +
      'Each will silently return { reason: "no_key" } to the frontend, which ' +
      'shows a generic "could not analyze" error to the user — no crash, no ' +
      'visible alert, easy to miss.\n' +
      'Set OPENAI_API_KEY in the environment to restore these features.\n',
    );
  }
}
