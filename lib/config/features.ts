/**
 * Feature Flags Configuration
 *
 * Centralized feature flag management for experimental features.
 * Flags can be toggled via environment variables to enable/disable features
 * without code changes.
 *
 * Usage:
 * ```typescript
 * import { FEATURES } from '@/lib/config/features';
 *
 * if (FEATURES.MISSING_TIMESTAMP_HANDLING) {
 *   // New algorithm
 * } else {
 *   // Stable algorithm
 * }
 * ```
 */

/**
 * Feature flag configuration object
 */
export const FEATURES = {
  /**
   * Missing Timestamp Handling (v2)
   *
   * Enables enhanced algorithm that gracefully handles missing timestamps
   * (check-out, break times) with quality flags and completeness tracking.
   *
   * When enabled:
   * - Allows nullable timestamps (except check-in)
   * - Adds data quality indicators
   * - Tracks missing timestamp flags
   * - Calculates completeness percentage
   *
   * Environment variable: NEXT_PUBLIC_MISSING_TS_HANDLING
   * Default: false (stable algorithm)
   */
  MISSING_TIMESTAMP_HANDLING:
    process.env.NEXT_PUBLIC_MISSING_TS_HANDLING === 'true',
} as const;

/**
 * Type-safe feature flag keys
 */
export type FeatureFlag = keyof typeof FEATURES;

/**
 * Get feature flag value with type safety
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURES[flag];
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): FeatureFlag[] {
  return (Object.keys(FEATURES) as FeatureFlag[]).filter(
    (key) => FEATURES[key]
  );
}

/**
 * Feature flag status for debugging
 */
export function getFeatureFlagStatus(): Record<FeatureFlag, boolean> {
  return { ...FEATURES };
}
