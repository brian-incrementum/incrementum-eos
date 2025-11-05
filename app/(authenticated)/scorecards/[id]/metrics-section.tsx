'use client'

import { useState } from 'react'
import type { Tables } from '@/lib/types/database.types'
import type { EmployeeWithProfile } from '@/lib/actions/employees'
import { MetricCard } from './metric-card'
import { AddMetricModal } from './add-metric-modal'
import { EditMetricModal } from './edit-metric-modal'
import { ArchiveMetricDialog } from './archive-metric-dialog'
import { MetricsEmptyState } from './metrics-empty-state'

type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>

interface MetricsSectionProps {
  scorecardId: string
  metrics: Metric[]
  entries: MetricEntry[]
  employees: EmployeeWithProfile[]
  currentUserId: string
}

export function MetricsSection({
  scorecardId,
  metrics,
  entries,
  employees,
  currentUserId,
}: MetricsSectionProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null)

  const handleEditClick = (metric: Metric) => {
    setSelectedMetric(metric)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (metric: Metric) => {
    setSelectedMetric(metric)
    setIsArchiveDialogOpen(true)
  }

  const handleAddClick = () => {
    setIsAddModalOpen(true)
  }

  return (
    <div>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Metrics</h2>
        {metrics.length > 0 && (
          <button
            onClick={handleAddClick}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <svg
              className="-ml-0.5 mr-1.5 h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Metric
          </button>
        )}
      </div>

      {/* Metrics Grid or Empty State */}
      {metrics.length === 0 ? (
        <MetricsEmptyState onAddClick={handleAddClick} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((metric) => {
            // Get entries for this metric (last 5)
            const metricEntries = entries
              .filter((e) => e.metric_id === metric.id)
              .slice(0, 5)

            return (
              <MetricCard
                key={metric.id}
                metric={metric}
                entries={metricEntries}
                scorecardId={scorecardId}
                onEdit={() => handleEditClick(metric)}
                onDelete={() => handleDeleteClick(metric)}
              />
            )
          })}
        </div>
      )}

      {/* Modals */}
      <AddMetricModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        scorecardId={scorecardId}
        employees={employees}
        currentUserId={currentUserId}
      />

      <EditMetricModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        metric={selectedMetric}
        scorecardId={scorecardId}
        employees={employees}
        currentUserId={currentUserId}
      />

      <ArchiveMetricDialog
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        metric={selectedMetric}
        scorecardId={scorecardId}
      />
    </div>
  )
}
