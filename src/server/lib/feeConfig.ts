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
  minFeeAmountRupees: number;
  defaultFeePercent: number;
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
      maxFeePercent: 35,
      minFeeAmountRupees: 50000,
      defaultFeePercent: 8,
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
