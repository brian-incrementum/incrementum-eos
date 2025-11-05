import type { Tables } from '@/lib/types/database.types'
import { getStatusClasses, type StatusColor } from '@/lib/utils/scorecard-ui-helpers'

type MetricEntry = Tables<'metric_entries'>

interface MiniChartProps {
  entries: MetricEntry[]
  status: StatusColor
}

export function MiniChart({ entries, status }: MiniChartProps) {
  // Take last 8 entries
  const displayEntries = entries.slice(-8)
  const values = displayEntries.map(e => e.value)

  if (values.length === 0) {
    return <div className="flex items-end gap-0.5 h-8 w-32" />
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1

  const classes = getStatusClasses(status)

  return (
    <div className="flex items-end gap-0.5 h-8 w-32">
      {values.map((value, i) => {
        const height = ((value - min) / range) * 100

        return (
          <div
            key={i}
            className={`flex-1 ${classes.chart} opacity-60 rounded-sm transition-all hover:opacity-100`}
            style={{ height: `${Math.max(height, 10)}%` }}
          />
        )
      })}
    </div>
  )
}
