'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Archive, RotateCcw, Trash2 } from 'lucide-react'
import type { Tables } from '@/lib/types/database.types'
import type { EmployeeWithProfile } from '@/lib/actions/employees'
import { PermanentDeleteDialog } from '../permanent-delete-dialog'
import { restoreMetric } from '@/lib/actions/metrics'

type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>
type Profile = Tables<'profiles'>

interface MetricWithEntries extends Metric {
  entries: MetricEntry[]
  owner?: Profile | null
}

interface ArchivedMetricsSectionProps {
  archivedMetrics: MetricWithEntries[]
  scorecardId: string
  employees: EmployeeWithProfile[]
  shouldExpand?: boolean
  onExpandChange?: (isExpanded: boolean) => void
}

export function ArchivedMetricsSection({
  archivedMetrics,
  scorecardId,
  employees,
  shouldExpand = false,
  onExpandChange,
}: ArchivedMetricsSectionProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  const [metricToDelete, setMetricToDelete] = useState<Metric | null>(null)
  const [restoringMetricId, setRestoringMetricId] = useState<string | null>(null)

  // Expand when shouldExpand prop changes
  useEffect(() => {
    if (shouldExpand !== isExpanded) {
      setIsExpanded(shouldExpand)
    }
  }, [shouldExpand, isExpanded])

  // Notify parent when expanded state changes
  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    if (onExpandChange) {
      onExpandChange(newState)
    }
  }

  if (!archivedMetrics || archivedMetrics.length === 0) {
    return null
  }

  const handleRestore = async (metric: Metric) => {
    setRestoringMetricId(metric.id)
    try {
      const result = await restoreMetric(metric.id, scorecardId)
      if (result.success) {
        // Refresh server data to update UI
        router.refresh()
      }
    } finally {
      setRestoringMetricId(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div
      data-archived-metrics-section
      className="mt-8 border-t-2 border-orange-200 pt-6 bg-orange-50 -mx-6 px-6 pb-6 rounded-b-lg"
    >
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full text-left group hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Archive className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Archived Metrics
            </h2>
            <p className="text-sm text-gray-600">
              {archivedMetrics.length} {archivedMetrics.length === 1 ? 'metric' : 'metrics'} archived
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-6 h-6 text-gray-500 group-hover:text-gray-700" />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-500 group-hover:text-gray-700" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-600 bg-white border border-orange-200 rounded-lg p-3">
            These metrics have been archived and are hidden from the main scorecard.
            Click <span className="font-semibold text-blue-600">Restore</span> to bring them back,
            or <span className="font-semibold text-red-600">Delete</span> to permanently remove them.
          </p>

          <div className="space-y-3">
            {archivedMetrics.map((metric) => {
            const owner = employees.find(emp => emp.profile?.id === metric.owner_user_id)
            const archivedBy = employees.find(emp => emp.profile?.id === metric.archived_by)
            const isRestoring = restoringMetricId === metric.id

            return (
              <div
                key={metric.id}
                className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium text-gray-700">{metric.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                        Archived
                      </span>
                    </div>

                    {metric.description && (
                      <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                    )}

                    <div className="mt-2 space-y-1 text-xs text-gray-500">
                      <p>Archived on: {formatDate(metric.archived_at)}</p>
                      {archivedBy && (
                        <p>Archived by: {archivedBy.profile?.full_name || archivedBy.profile?.email}</p>
                      )}
                      {metric.archive_reason && (
                        <p className="italic">Reason: {metric.archive_reason}</p>
                      )}
                      {owner && (
                        <p>Owner: {owner.profile?.full_name || owner.profile?.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleRestore(metric)}
                      disabled={isRestoring}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Restore metric"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {isRestoring ? 'Restoring...' : 'Restore'}
                    </button>
                    <button
                      onClick={() => setMetricToDelete(metric)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                      title="Permanently delete metric"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )}

      <PermanentDeleteDialog
        open={!!metricToDelete}
        onOpenChange={(open) => !open && setMetricToDelete(null)}
        metric={metricToDelete}
        scorecardId={scorecardId}
      />
    </div>
  )
}
