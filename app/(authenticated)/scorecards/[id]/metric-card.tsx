'use client'

import { useState, useTransition } from 'react'
import type { Tables } from '@/lib/types/database.types'
import { upsertMetricEntry } from '@/lib/actions/metric-entries'
import { getCurrentPeriodStart, formatPeriodDate } from '@/lib/utils/date-helpers'
import { calculateScore, getScoreColor, formatScore } from '@/lib/utils/score-helpers'

type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>

interface MetricCardProps {
  metric: Metric
  entries: MetricEntry[]
  scorecardId: string
  onEdit: (metric: Metric) => void
  onDelete: (metric: Metric) => void
}

export function MetricCard({
  metric,
  entries,
  scorecardId,
  onEdit,
  onDelete,
}: MetricCardProps) {
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Get current period entry if exists
  const currentPeriodStart = getCurrentPeriodStart(metric.cadence)
  const currentPeriodStr = currentPeriodStart.toISOString().split('T')[0]
  const currentEntry = entries.find((e) => e.period_start === currentPeriodStr)

  // Calculate current score if entry exists
  const currentScore = currentEntry
    ? calculateScore(currentEntry.value, metric)
    : null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!value.trim()) return

    setError(null)

    const formData = new FormData()
    formData.append('value', value)
    formData.append('note', note)

    startTransition(async () => {
      const result = await upsertMetricEntry(metric.id, scorecardId, formData)

      if (result.success) {
        setValue('')
        setNote('')
      } else {
        setError(result.error || 'Failed to save entry')
      }
    })
  }

  // Helper functions
  const getCadenceBadgeColor = (cadence: string) => {
    switch (cadence) {
      case 'weekly':
        return 'bg-blue-100 text-blue-800'
      case 'monthly':
        return 'bg-green-100 text-green-800'
      case 'quarterly':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getScoringModeLabel = (mode: string) => {
    switch (mode) {
      case 'at_least':
        return 'At Least'
      case 'at_most':
        return 'At Most'
      case 'between':
        return 'Between'
      case 'yes_no':
        return 'Yes/No'
      default:
        return mode
    }
  }

  const formatTarget = () => {
    const unit = metric.unit || ''

    if (metric.scoring_mode === 'yes_no') {
      return `Target: ${metric.target_boolean ? 'Yes' : 'No'}`
    } else if (metric.scoring_mode === 'between') {
      return `${unit}${metric.target_min} - ${unit}${metric.target_max}`
    } else {
      return `${unit}${metric.target_value}`
    }
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      {/* Header with Score Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {metric.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCadenceBadgeColor(metric.cadence)}`}
            >
              {metric.cadence}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {getScoringModeLabel(metric.scoring_mode)}
            </span>
          </div>
        </div>
        {currentScore !== null && (
          <div
            className={`ml-3 px-3 py-1 rounded-full text-sm font-semibold ${
              getScoreColor(currentScore).bgClass
            } ${getScoreColor(currentScore).textClass}`}
          >
            {formatScore(currentScore)}
          </div>
        )}
      </div>

      {/* Target */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-500">Target</p>
        <p className="mt-1 text-xl font-semibold text-gray-900">
          {formatTarget()}
        </p>
      </div>

      {/* Current Period Entry Form */}
      <div className="mb-4 p-4 bg-gray-50 rounded-md border border-gray-200">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label
              htmlFor={`value-${metric.id}`}
              className="text-sm font-medium text-gray-700 block mb-1"
            >
              {formatPeriodDate(currentPeriodStart, metric.cadence)} Value
            </label>
            {metric.scoring_mode === 'yes_no' ? (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value === '1'}
                    onChange={(e) => setValue(e.target.checked ? '1' : '0')}
                    disabled={isPending}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
                  />
                  <span className="text-sm font-medium">
                    {value === '1' ? 'Yes' : 'No'}
                  </span>
                </label>
                {currentEntry && (
                  <span className="text-sm text-gray-500">
                    (Current: {currentEntry.value === 1 ? 'Yes' : 'No'})
                  </span>
                )}
              </div>
            ) : (
              <input
                id={`value-${metric.id}`}
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={currentEntry ? String(currentEntry.value) : 'Enter value'}
                disabled={isPending}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            )}
          </div>
          <div className="mb-3">
            <label
              htmlFor={`note-${metric.id}`}
              className="text-sm font-medium text-gray-700 block mb-1"
            >
              Note (optional)
            </label>
            <textarea
              id={`note-${metric.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context or notes..."
              disabled={isPending}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <button
            type="submit"
            disabled={isPending || (metric.scoring_mode !== 'yes_no' && !value.trim())}
            className="w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving...' : currentEntry ? 'Update Entry' : 'Save Entry'}
          </button>
        </form>
      </div>

      {/* Historical Entries */}
      {entries.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Entries</h4>
          <div className="space-y-2">
            {entries.map((entry) => {
              const score = calculateScore(entry.value, metric)
              const scoreInfo = getScoreColor(score)

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {formatPeriodDate(new Date(entry.period_start), metric.cadence)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {metric.unit || ''}
                      {entry.value}
                      {entry.note && ` • ${entry.note}`}
                    </p>
                  </div>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${scoreInfo.bgClass} ${scoreInfo.textClass}`}
                  >
                    {formatScore(score)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={() => onEdit(metric)}
          className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(metric)}
          className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
