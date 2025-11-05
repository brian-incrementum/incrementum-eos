import { PERIOD_COUNTS } from './constants'

/**
 * Get the start date for the current period based on cadence
 */
export function getCurrentPeriodStart(
  cadence: 'weekly' | 'monthly' | 'quarterly'
): Date {
  const now = new Date()

  switch (cadence) {
    case 'weekly': {
      // Get Monday of current week
      const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
      const diff = day === 0 ? -6 : 1 - day // If Sunday, go back 6 days
      const monday = new Date(now)
      monday.setDate(now.getDate() + diff)
      monday.setHours(0, 0, 0, 0)
      return monday
    }

    case 'monthly': {
      // Get first day of current month
      return new Date(now.getFullYear(), now.getMonth(), 1)
    }

    case 'quarterly': {
      // Get first day of current quarter
      const currentMonth = now.getMonth() // 0-11
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3 // 0, 3, 6, 9
      return new Date(now.getFullYear(), quarterStartMonth, 1)
    }
  }
}

/**
 * Format a period start date for display based on cadence
 */
export function formatPeriodDate(
  date: Date | string,
  cadence: 'weekly' | 'monthly' | 'quarterly'
): string {
  const d = typeof date === 'string' ? parseISODate(date) : date

  switch (cadence) {
    case 'weekly': {
      // Format as "Week of Jan 20, 2025"
      return `Week of ${d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
    }

    case 'monthly': {
      // Format as "January 2025"
      return d.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    }

    case 'quarterly': {
      // Format as "Q1 2025"
      const month = d.getMonth()
      const quarter = Math.floor(month / 3) + 1
      return `Q${quarter} ${d.getFullYear()}`
    }
  }
}

/**
 * Format a date string to ISO date (YYYY-MM-DD) for database storage
 */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Parse an ISO date string (YYYY-MM-DD) to a Date object in local timezone
 * Avoids timezone conversion issues that occur with new Date(isoString)
 */
export function parseISODate(isoDateString: string): Date {
  const [year, month, day] = isoDateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get the last N periods (including current) for a given cadence
 * Returns dates in descending order (newest first)
 *
 * @param cadence - The period cadence (weekly, monthly, quarterly)
 * @param count - Optional number of periods to return. Defaults to PERIOD_COUNTS[cadence]
 */
export function getLastNPeriods(
  cadence: 'weekly' | 'monthly' | 'quarterly',
  count?: number
): string[] {
  const periods: string[] = []
  const current = getCurrentPeriodStart(cadence)
  const periodCount = count ?? PERIOD_COUNTS[cadence]

  for (let i = 0; i < periodCount; i++) {
    const period = new Date(current)

    switch (cadence) {
      case 'weekly':
        // Go back i weeks (7 days each)
        period.setDate(current.getDate() - (i * 7))
        break

      case 'monthly':
        // Go back i months
        period.setMonth(current.getMonth() - i)
        break

      case 'quarterly':
        // Go back i quarters (3 months each)
        period.setMonth(current.getMonth() - (i * 3))
        break
    }

    periods.push(toISODate(period))
  }

  return periods
}

/**
 * @deprecated Use getLastNPeriods() instead
 * Backward compatibility export
 */
export function getLast8Periods(
  cadence: 'weekly' | 'monthly' | 'quarterly'
): string[] {
  return getLastNPeriods(cadence, 8)
}
