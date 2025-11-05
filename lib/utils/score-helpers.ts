import type { Tables } from '@/lib/types/database.types'

type Metric = Tables<'metrics'>

/**
 * Calculate achievement score percentage based on metric value and targets
 */
export function calculateScore(value: number, metric: Metric): number {
  switch (metric.scoring_mode) {
    case 'at_least': {
      // Higher is better - e.g., "revenue should be at least $10k"
      if (!metric.target_value) return 0
      return (value / metric.target_value) * 100
    }

    case 'at_most': {
      // Lower is better - e.g., "expenses should be at most $1k"
      if (!metric.target_value) return 0

      // If at or under target, that's 100% (goal achieved)
      if (value <= metric.target_value) {
        return 100
      }

      // If over target, calculate penalty
      return (metric.target_value / value) * 100
    }

    case 'between': {
      // Value should be within range
      if (!metric.target_min || !metric.target_max) return 0

      // If within range, 100%
      if (value >= metric.target_min && value <= metric.target_max) {
        return 100
      }

      // If below min, calculate how close
      if (value < metric.target_min) {
        return (value / metric.target_min) * 100
      }

      // If above max, calculate penalty
      return (metric.target_max / value) * 100
    }

    case 'yes_no': {
      // Boolean metrics: 100% if matches target, 0% otherwise
      if (metric.target_boolean === null) return 0

      // Convert value to boolean (1 = true, 0 = false)
      const boolValue = value === 1

      // Return 100% if value matches target, 0% otherwise
      return boolValue === metric.target_boolean ? 100 : 0
    }

    default:
      return 0
  }
}

/**
 * Get color classes and label based on score percentage
 */
export function getScoreColor(score: number): {
  bgClass: string
  textClass: string
  label: string
} {
  if (score >= 100) {
    return {
      bgClass: 'bg-green-100',
      textClass: 'text-green-800',
      label: 'On Target',
    }
  } else if (score >= 75) {
    return {
      bgClass: 'bg-yellow-100',
      textClass: 'text-yellow-800',
      label: 'Near Target',
    }
  } else {
    return {
      bgClass: 'bg-red-100',
      textClass: 'text-red-800',
      label: 'Below Target',
    }
  }
}

/**
 * Format score percentage for display
 */
export function formatScore(score: number): string {
  return `${Math.round(score)}%`
}
