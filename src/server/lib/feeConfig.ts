/**
 * Fee Configuration Helper
 * 
 * P0 #4: Provides consistent access to fee config across the platform
 * Caches config in memory for 1 minute to reduce DB hits
 */

import { db } from '@/server/db/client.js';
import { commissionConfig } from '@/server/db/schema.js';

interface FeeConfig {
  id: number;
  minFeePercent: number;
  maxFeePercent: number;
  defaultFeePercent: number;
  platformFeePct: number;
  payoutDays: number;
  updatedAt: Date | null;
}

let cachedConfig: FeeConfig | null = null;
let cacheExpiry: number = 0;

const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Get current fee configuration
 * Reads from cache if available, otherwise fetches from DB
 */
export async function getFeeConfig(): Promise<FeeConfig> {
  // Return cached if still valid
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig;
  }

  // Fetch from database
  const [config] = await db
    .select()
    .from(commissionConfig)
    .limit(1);

  if (!config) {
    // Fallback to defaults if not configured
    console.warn('[getFeeConfig] Fee configuration not found, using defaults');
    cachedConfig = {
      id: 0,
      minFeePercent: 5,
      maxFeePercent: 15,
      defaultFeePercent: 8,
      platformFeePct: 2,
      payoutDays: 3,
      updatedAt: null,
    };
  } else {
    cachedConfig = config;
  }

  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return cachedConfig;
}

/**
 * Invalidate cache (call after updating config)
 */
export function invalidateFeeCache(): void {
  cachedConfig = null;
  cacheExpiry = 0;
  console.log('[getFeeConfig] Cache invalidated');
}

/**
 * Get platform fee percentage
 * Convenience function for most common use case
 */
export async function getPlatformFeePct(): Promise<number> {
  const config = await getFeeConfig();
  return config.platformFeePct;
}

/**
 * Calculate commission split
 * Given a job fee %, returns platform and consultant split
 */
export async function calculateCommissionSplit(jobFeePercent: number): Promise<{
  platformFeePercent: number;
  consultantFeePercent: number;
}> {
  const config = await getFeeConfig();
  return {
    platformFeePercent: config.platformFeePct,
    consultantFeePercent: Math.max(jobFeePercent - config.platformFeePct, 0),
  };
}
