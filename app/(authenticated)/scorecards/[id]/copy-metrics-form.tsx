'use client'

import { useState, useTransition } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { copyMetrics } from '@/lib/actions/metrics'
import type { Tables } from '@/lib/types/database.types'

type Metric = Tables<'metrics'>

interface MetricWithEntries extends Metric {
  entries: any[]
  owner?: any
}

interface CopyMetricsFormProps {
  scorecardId: string
  scorecardOwnerId: string
  metrics: MetricWithEntries[]
  onSuccess: () => void
}

interface MetricToCopy {
  sourceMetricId: string
  targetValue?: number | null
  targetMin?: number | null
  targetMax?: number | null
  targetBoolean?: boolean | null
}

export function CopyMetricsForm({ scorecardId, scorecardOwnerId, metrics, onSuccess }: CopyMetricsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set())
  const [targetValues, setTargetValues] = useState<Record<string, MetricToCopy>>({})

  // Group metrics by cadence for better organization
  const metricsByCadence = {
    weekly: metrics.filter((m) => m.cadence === 'weekly'),
    monthly: metrics.filter((m) => m.cadence === 'monthly'),
    quarterly: metrics.filter((m) => m.cadence === 'quarterly'),
  }

  const toggleMetric = (metricId: string, metric: MetricWithEntries) => {
    const newSelected = new Set(selectedMetrics)
    if (newSelected.has(metricId)) {
      newSelected.delete(metricId)
      // Remove from target values
      const newTargetValues = { ...targetValues }
      delete newTargetValues[metricId]
      setTargetValues(newTargetValues)
    } else {
      newSelected.add(metricId)
      // Initialize with default values from source metric
      const newTargetValues = { ...targetValues }
      newTargetValues[metricId] = {
        sourceMetricId: metricId,
        targetValue: metric.target_value,
        targetMin: metric.target_min,
        targetMax: metric.target_max,
        targetBoolean: metric.target_boolean,
      }
      setTargetValues(newTargetValues)
    }
    setSelectedMetrics(newSelected)
  }

  const updateTargetValue = (metricId: string, field: keyof MetricToCopy, value: any) => {
    setTargetValues((prev) => ({
      ...prev,
      [metricId]: {
        ...prev[metricId],
        [field]: value,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedMetrics.size === 0) {
      setError('Please select at least one metric to copy')
      return
    }

    const metricsToCopy = Array.from(selectedMetrics).map((id) => targetValues[id])

    startTransition(async () => {
      const result = await copyMetrics(scorecardId, scorecardOwnerId, metricsToCopy)

      if (result.success) {
        setSelectedMetrics(new Set())
        setTargetValues({})
        onSuccess()
      } else {
        // Show detailed errors
        const errors = result.results
          .filter((r) => !r.success)
          .map((r) => r.error)
          .join('; ')
        setError(errors || result.error || 'Failed to copy metrics')
      }
    })
  }

  const renderMetricRow = (metric: MetricWithEntries) => {
    const isSelected = selectedMetrics.has(metric.id)
    const scoringModeLabels = {
      at_least: 'At Least (≥)',
      at_most: 'At Most (≤)',
      between: 'Between',
      yes_no: 'Yes/No',
    }

    return (
      <div
        key={metric.id}
        className={`p-3 border rounded-md ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            id={`metric-${metric.id}`}
            checked={isSelected}
            onCheckedChange={() => toggleMetric(metric.id, metric)}
            className="mt-1"
          />
          <div className="flex-1">
            <label
              htmlFor={`metric-${metric.id}`}
              className="text-sm font-medium cursor-pointer block"
            >
              {metric.name}
            </label>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {scoringModeLabels[metric.scoring_mode as keyof typeof scoringModeLabels]}
              </Badge>
              {metric.unit && (
                <Badge variant="secondary" className="text-xs">
                  {metric.unit}
                </Badge>
              )}
            </div>

            {isSelected && (
              <div className="mt-3 grid gap-2">
                {/* At Least / At Most */}
                {(metric.scoring_mode === 'at_least' || metric.scoring_mode === 'at_most') && (
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-gray-700">
                      Target Value
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={targetValues[metric.id]?.targetValue ?? ''}
                      onChange={(e) =>
                        updateTargetValue(
                          metric.id,
                          'targetValue',
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="Enter target value"
                      className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>
                )}

                {/* Between */}
                {metric.scoring_mode === 'between' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-gray-700">
                        Target Min
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={targetValues[metric.id]?.targetMin ?? ''}
                        onChange={(e) =>
                          updateTargetValue(
                            metric.id,
                            'targetMin',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="Min"
                        className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-xs font-medium text-gray-700">
                        Target Max
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={targetValues[metric.id]?.targetMax ?? ''}
                        onChange={(e) =>
                          updateTargetValue(
                            metric.id,
                            'targetMax',
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="Max"
                        className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Yes/No */}
                {metric.scoring_mode === 'yes_no' && (
                  <div className="grid gap-1">
                    <label className="text-xs font-medium text-gray-700">
                      Target
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={targetValues[metric.id]?.targetBoolean === true}
                          onChange={() =>
                            updateTargetValue(metric.id, 'targetBoolean', true)
                          }
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={targetValues[metric.id]?.targetBoolean === false}
                          onChange={() =>
                            updateTargetValue(metric.id, 'targetBoolean', false)
                          }
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">No</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {/* Weekly Metrics */}
        {metricsByCadence.weekly.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Weekly Metrics
            </h4>
            <div className="space-y-2">
              {metricsByCadence.weekly.map(renderMetricRow)}
            </div>
          </div>
        )}

        {/* Monthly Metrics */}
        {metricsByCadence.monthly.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Monthly Metrics
            </h4>
            <div className="space-y-2">
              {metricsByCadence.monthly.map(renderMetricRow)}
            </div>
          </div>
        )}

        {/* Quarterly Metrics */}
        {metricsByCadence.quarterly.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Quarterly Metrics
            </h4>
            <div className="space-y-2">
              {metricsByCadence.quarterly.map(renderMetricRow)}
            </div>
          </div>
        )}

        {metrics.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">
            No metrics available to copy
          </p>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t">
        <p className="text-sm text-gray-600">
          {selectedMetrics.size} metric{selectedMetrics.size !== 1 ? 's' : ''} selected
        </p>
        <button
          type="submit"
          disabled={isPending || selectedMetrics.size === 0}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Copying...' : `Copy ${selectedMetrics.size} Metric${selectedMetrics.size !== 1 ? 's' : ''}`}
        </button>
      </div>
    </form>
  )
}
