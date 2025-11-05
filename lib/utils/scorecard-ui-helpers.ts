import type { Tables } from '@/lib/types/database.types'
import { calculateScore } from './score-helpers'
import { parseISODate } from './date-helpers'

type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>

export type StatusColor = 'green' | 'yellow' | 'red'

/**
 * Get status color based on value and metric targets
 * Green: meets or exceeds goal
 * Yellow: close to goal (75-99%)
 * Red: below goal threshold (<75%)
 */
export function getStatusColor(value: number, metric: Metric): StatusColor {
  const score = calculateScore(value, metric)

  if (score >= 100) return 'green'
  if (score >= 75) return 'yellow'
  return 'red'
}

/**
 * Get status color CSS classes for backgrounds and text
 */
export function getStatusClasses(status: StatusColor) {
  const classes = {
    green: {
      bg: 'bg-green-50',
      text: 'text-green-900',
      dot: 'bg-green-500',
      badge: 'bg-green-100 text-green-800',
      chart: 'bg-green-400'
    },
    yellow: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-900',
      dot: 'bg-yellow-500',
      badge: 'bg-yellow-100 text-yellow-800',
      chart: 'bg-yellow-400'
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-900',
      dot: 'bg-red-500',
      badge: 'bg-red-100 text-red-800',
      chart: 'bg-red-400'
    }
  }

  return classes[status]
}

/**
 * Format value with unit for display
 */
export function formatValue(value: number, unit: string | null, metric?: Metric): string {
  // For boolean metrics, format as Yes/No
  if (metric && metric.scoring_mode === 'yes_no') {
    return value === 1 ? 'Yes' : 'No'
  }

  if (unit === '$') {
    return `$${value.toLocaleString()}`
  }
  if (unit === '%') {
    return `${value}%`
  }
  if (unit) {
    return `${value}${unit}`
  }
  return value.toString()
}

/**
 * Format goal display based on scoring mode
 */
export function formatGoal(metric: Metric): string {
  switch (metric.scoring_mode) {
    case 'at_least':
      if (metric.target_value === 0) return '= 0'
      return `>= ${formatValue(metric.target_value || 0, metric.unit, metric)}`
    case 'at_most':
      return `<= ${formatValue(metric.target_value || 0, metric.unit, metric)}`
    case 'between':
      return `${formatValue(metric.target_min || 0, metric.unit, metric)} to ${formatValue(metric.target_max || 0, metric.unit, metric)}`
    case 'yes_no':
      return `Target: ${metric.target_boolean ? 'Yes' : 'No'}`
    default:
      return 'N/A'
  }
}

/**
 * Calculate trend from entries (up, down, flat)
 */
export function getTrend(entries: MetricEntry[]): 'up' | 'down' | 'flat' {
  if (entries.length < 2) return 'flat'

  const values = entries.map(e => e.value)
  const recent = values.slice(-3)
  const previous = values.slice(-6, -3)

  if (previous.length === 0) return 'flat'

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const prevAvg = previous.reduce((a, b) => a + b, 0) / previous.length

  if (recentAvg > prevAvg * 1.05) return 'up'
  if (recentAvg < prevAvg * 0.95) return 'down'
  return 'flat'
}

/**
 * Calculate average value from entries
 */
export function getAverage(entries: MetricEntry[]): number {
  if (entries.length === 0) return 0
  const sum = entries.reduce((acc, entry) => acc + entry.value, 0)
  return sum / entries.length
}

/**
 * Format date range for week (e.g., "Sep 2 - Sep 8")
 */
export function formatDateRange(dateStr: string): string {
  const date = parseISODate(dateStr)
  const endDate = new Date(date)
  endDate.setDate(date.getDate() + 6)

  const startMonth = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return `${startMonth} - ${endMonth}`
}

/**
 * Format date for display (e.g., "Sep 2")
 */
export function formatDate(dateStr: string): string {
  const date = parseISODate(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format month for display (e.g., "Sep 2025")
 */
export function formatMonth(dateStr: string): string {
  const date = parseISODate(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

/**
 * Format quarter for display (e.g., "Q3 2025")
 */
export function formatQuarter(dateStr: string): string {
  const date = parseISODate(dateStr)
  const quarter = Math.floor(date.getMonth() / 3) + 1
  const year = date.getFullYear()
  return `Q${quarter} ${year}`
}

/**
 * Format period based on cadence
 */
export function formatPeriod(dateStr: string, cadence: 'weekly' | 'monthly' | 'quarterly'): string {
  switch (cadence) {
    case 'weekly':
      return formatDateRange(dateStr)
    case 'monthly':
      return formatMonth(dateStr)
    case 'quarterly':
      return formatQuarter(dateStr)
    default:
      return formatDate(dateStr)
  }
}

/**
 * Calculate week over week change percentage
 */
export function calculateWoWChange(currentValue: number, previousValue: number | null): number | null {
  if (previousValue === null || previousValue === 0) return null
  return ((currentValue - previousValue) / previousValue) * 100
}

/**
 * Calculate vs goal percentage
 */
export function calculateVsGoal(value: number, metric: Metric): number {
  switch (metric.scoring_mode) {
    case 'at_least':
      if (!metric.target_value) return 0
      return ((value / metric.target_value) - 1) * 100
    case 'at_most':
      if (!metric.target_value) return 0
      if (value <= metric.target_value) return 0
      return ((value / metric.target_value) - 1) * 100
    case 'between':
      if (!metric.target_min || !metric.target_max) return 0
      if (value >= metric.target_min && value <= metric.target_max) return 0
      if (value < metric.target_min) {
        return ((value / metric.target_min) - 1) * 100
      }
      return ((value / metric.target_max) - 1) * 100
    case 'yes_no':
      // For boolean metrics, return 0 if matches target, -100 if doesn't
      if (metric.target_boolean === null) return 0
      const boolValue = value === 1
      return boolValue === metric.target_boolean ? 0 : -100
    default:
      return 0
  }
}

/**
 * Get owner initials for avatar
 */
export function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
}
