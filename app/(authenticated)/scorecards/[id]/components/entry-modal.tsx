'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import type { Tables } from '@/lib/types/database.types'
import { formatValue, formatDate } from '@/lib/utils/scorecard-ui-helpers'
import { upsertMetricEntry } from '@/lib/actions/metric-entries'

type Metric = Tables<'metrics'>

interface EntryModalProps {
  metric: Metric
  scorecardId: string
  currentPeriodStart: string
  onClose: () => void
}

export function EntryModal({ metric, scorecardId, currentPeriodStart, onClose }: EntryModalProps) {
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await upsertMetricEntry(metric.id, scorecardId, formData)
      if (result.success) {
        onClose()
      } else {
        alert(result.error || 'Failed to save value')
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Add Weekly Value</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">
            Metric: <span className="font-semibold text-gray-900">{metric.name}</span>
          </p>
          <p className="text-sm text-gray-600">
            Goal: <span className="font-semibold text-gray-900">{formatValue(metric.target_value || 0, metric.unit)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Value for {formatDate(currentPeriodStart)}
            </label>
            <div className="relative">
              {metric.unit === '$' && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              )}
              <input
                type="number"
                step="any"
                name="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${metric.unit === '$' ? 'pl-7' : ''}`}
                placeholder="Enter value"
                autoFocus
                required
                disabled={isPending}
              />
              {metric.unit && metric.unit !== '$' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{metric.unit}</span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving...' : 'Save Value'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
