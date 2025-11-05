'use client'

import { useState, useTransition } from 'react'
import { X } from 'lucide-react'
import type { Tables } from '@/lib/types/database.types'
import { formatValue, formatDate } from '@/lib/utils/scorecard-ui-helpers'
import { updateEntryNote } from '@/lib/actions/metric-entries'

type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>

interface NoteModalProps {
  metric: Metric
  entry: MetricEntry
  scorecardId: string
  onClose: () => void
}

export function NoteModal({ metric, entry, scorecardId, onClose }: NoteModalProps) {
  const [noteText, setNoteText] = useState(entry.note || '')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    startTransition(async () => {
      const result = await updateEntryNote(
        metric.id,
        entry.period_start,
        scorecardId,
        noteText
      )
      if (result.success) {
        onClose()
      } else {
        alert(result.error || 'Failed to save note')
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            {entry.note ? 'Edit Note' : 'Add Note'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">
            Metric: <span className="font-semibold text-gray-900">{metric.name}</span>
          </p>
          <p className="text-sm text-gray-600 mb-1">
            Period: <span className="font-semibold text-gray-900">{formatDate(entry.period_start)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Value: <span className="font-semibold text-gray-900">{formatValue(entry.value, metric.unit)}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note
            </label>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Add context or explanation for this period's number..."
              rows={4}
              autoFocus
              disabled={isPending}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving...' : 'Save Note'}
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
