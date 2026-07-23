import type { Request, Response } from 'express';
import { getSecret } from '#airo/secrets';

/**
 * GET /api/analytics/config
 * Returns the GA4 Measurement ID for the frontend to use.
 * The secret never appears in client-side source code.
 */
export default function handler(_req: Request, res: Response) {
  const measurementId = getSecret('GA_MEASUREMENT_ID');
  if (!measurementId) {
    // Not configured — return empty so the frontend silently skips GA
    return res.json({ measurementId: null });
  }
  // 1-hour cache — safe since the ID rarely changes
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({ measurementId });
}
