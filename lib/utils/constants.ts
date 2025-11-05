/**
 * Application-wide configuration constants
 */

/**
 * Number of periods to display in the scorecard table for each cadence.
 *
 * - Weekly: 9 weeks = ~2.5 months (optimized for screen width with compact columns)
 * - Monthly: 8 months
 * - Quarterly: 8 quarters (2 years)
 */
export const PERIOD_COUNTS = {
  weekly: 9,
  monthly: 8,
  quarterly: 8,
} as const

export type Cadence = keyof typeof PERIOD_COUNTS
