'use client'

import { useState } from 'react'
import { X, Plus, MessageSquare, Edit2 } from 'lucide-react'
import type { Tables } from '@/lib/types/database.types'
import {
  formatValue,
  formatDate,
  getStatusColor,
  calculateWoWChange,
  calculateVsGoal,
  formatGoal,
} from '@/lib/utils/scorecard-ui-helpers'
import { StatusDot } from './status-dot'
import { EntryModal } from './entry-modal'
import { NoteModal } from './note-modal'

type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>

interface MetricWithEntries extends Metric {
  entries: MetricEntry[]
}

interface DetailModalProps {
  metric: MetricWithEntries
  scorecardId: string
  currentPeriodStart: string
  onClose: () => void
}

export function DetailModal({ metric, scorecardId, currentPeriodStart, onClose }: DetailModalProps) {
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<MetricEntry | null>(null)

  const sortedEntries = [...metric.entries].sort(
    (a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
  )

  const openNoteModal = (entry: MetricEntry) => {
    setSelectedEntry(entry)
    setShowNoteModal(true)
  }

  if (showEntryModal) {
    return (
      <EntryModal
        metric={metric}
        scorecardId={scorecardId}
        currentPeriodStart={currentPeriodStart}
        onClose={() => setShowEntryModal(false)}
      />
    )
  }

  if (showNoteModal && selectedEntry) {
    return (
      <NoteModal
        metric={metric}
        entry={selectedEntry}
        scorecardId={scorecardId}
        onClose={() => {
          setShowNoteModal(false)
          setSelectedEntry(null)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{metric.name}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Goal: {formatGoal(metric)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Period over Period</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Period Ending
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      vs Goal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Change
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedEntries.map((entry, idx) => {
                    const nextEntry = sortedEntries[idx + 1]
                    const change = calculateWoWChange(entry.value, nextEntry?.value || null)
                    const status = getStatusColor(entry.value, metric)
                    const vsGoal = calculateVsGoal(entry.value, metric)

                    return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(entry.period_start)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {formatValue(entry.value, metric.unit)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={vsGoal >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {vsGoal > 0 ? '+' : ''}
                            {vsGoal.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {change !== null ? (
                            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {change > 0 ? '+' : ''}
                              {change.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <StatusDot status={status} />
                            <span className="text-sm text-gray-600 capitalize">{status}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openNoteModal(entry)}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                          >
                            <MessageSquare className="w-4 h-4" />
                            {entry.note ? 'Edit Note' : 'Add Note'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowEntryModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add This Period's Value
            </button>
          </div>

          {sortedEntries.filter((e) => e.note).length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <div className="space-y-3">
                {sortedEntries
                  .filter((e) => e.note)
                  .map((entry) => (
                    <div key={entry.id} className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(entry.period_start)}
                        </span>
                        <button
                          onClick={() => openNoteModal(entry)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-700">{entry.note}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
