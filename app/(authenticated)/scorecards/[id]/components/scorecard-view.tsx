'use client'

import { useMemo, useState } from 'react'
import { Plus, Pencil, Archive, Trash2 } from 'lucide-react'
import type { Tables } from '@/lib/types/database.types'
import type { EmployeeWithProfile } from '@/lib/actions/employees'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getCurrentPeriodStart,
  formatPeriodDate,
  toISODate,
} from '@/lib/utils/date-helpers'
import { TableView } from './table-view'
import { DetailModal } from './detail-modal'
import { NoteModal } from './note-modal'
import { AddMetricModal } from '../add-metric-modal'
import { EditScorecardSheet } from '../edit-scorecard-sheet'
import { ArchiveMetricDialog } from '../archive-metric-dialog'
import { DeleteScorecardDialog } from '../delete-scorecard-dialog'
import { ArchivedMetricsSection } from './archived-metrics-section'

type Scorecard = Tables<'scorecards'>
type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>
type Profile = Tables<'profiles'>

interface MetricWithEntries extends Metric {
  entries: MetricEntry[]
  owner?: Profile | null
}

interface ScorecardViewProps {
  scorecard: Scorecard
  metrics: MetricWithEntries[]
  archivedMetrics: MetricWithEntries[]
  employees: EmployeeWithProfile[]
  currentUserId: string
  isAdmin: boolean
}

export function ScorecardView({ scorecard, metrics, archivedMetrics, employees, currentUserId, isAdmin }: ScorecardViewProps) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly')
  const [selectedMetric, setSelectedMetric] = useState<MetricWithEntries | null>(null)
  const [noteModalState, setNoteModalState] = useState<{
    metric: MetricWithEntries
    entry: MetricEntry
  } | null>(null)
  const [showAddMetricModal, setShowAddMetricModal] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)
  const [metricToArchive, setMetricToArchive] = useState<MetricWithEntries | null>(null)
  const [showDeleteScorecardDialog, setShowDeleteScorecardDialog] = useState(false)
  const [expandArchived, setExpandArchived] = useState(false)

  const cadenceConfigs = useMemo(
    () => (
      [
        {
          id: 'weekly' as const,
          label: 'Weekly',
        },
        {
          id: 'monthly' as const,
          label: 'Monthly',
        },
        {
          id: 'quarterly' as const,
          label: 'Quarterly',
        },
      ] satisfies Array<{
        id: 'weekly' | 'monthly' | 'quarterly'
        label: string
      }>
    ),
    []
  )

  const metricsByCadence = useMemo(() => {
    const mapped = new Map<'weekly' | 'monthly' | 'quarterly', MetricWithEntries[]>()

    cadenceConfigs.forEach(({ id }) => {
      mapped.set(id, [])
    })

    metrics.forEach((metric) => {
      const list = mapped.get(metric.cadence as 'weekly' | 'monthly' | 'quarterly')
      if (list) {
        list.push(metric)
      }
    })

    return mapped
  }, [cadenceConfigs, metrics])

  const periodStarts = useMemo(() => {
    const currentStart = (cadence: 'weekly' | 'monthly' | 'quarterly') =>
      toISODate(getCurrentPeriodStart(cadence))

    return new Map<
      'weekly' | 'monthly' | 'quarterly',
      ReturnType<typeof currentStart>
    >([
      ['weekly', currentStart('weekly')],
      ['monthly', currentStart('monthly')],
      ['quarterly', currentStart('quarterly')],
    ])
  }, [])

  const getCurrentPeriod = () => periodStarts.get(activeTab)

  const currentPeriodLabel = useMemo(() => {
    const periodStart = getCurrentPeriodStart(activeTab)
    return formatPeriodDate(periodStart, activeTab)
  }, [activeTab])

  const handleMetricClick = (metric: MetricWithEntries) => {
    setSelectedMetric(metric)
  }

  const handleNoteClick = (metric: MetricWithEntries, entry: MetricEntry) => {
    setNoteModalState({ metric, entry })
  }

  const handleArchiveMetric = (metric: MetricWithEntries) => {
    setMetricToArchive(metric)
  }

  const handleViewArchivedMetrics = () => {
    const newExpandedState = !expandArchived
    setExpandArchived(newExpandedState)

    // Only scroll to it when expanding
    if (newExpandedState) {
      setTimeout(() => {
        const archivedSection = document.querySelector('[data-archived-metrics-section]')
        if (archivedSection) {
          archivedSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  return (
    <div className="flex h-full w-full max-w-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{scorecard.name}</h1>
            <p className="text-gray-600">{currentPeriodLabel}</p>
          </div>
          <button
            onClick={() => setShowEditSheet(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit scorecard"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowDeleteScorecardDialog(true)}
              className="px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Delete this scorecard"
            >
              <Trash2 className="w-4 h-4" />
              Delete Scorecard
            </button>
          )}
          {archivedMetrics.length > 0 && (
            <button
              onClick={handleViewArchivedMetrics}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                expandArchived
                  ? 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700'
                  : 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archived ({archivedMetrics.length})
            </button>
          )}
          <button
            onClick={() => setShowAddMetricModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Measurable
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-1 flex-col overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'weekly' | 'monthly' | 'quarterly')}
          className="flex flex-1 min-h-0 flex-col overflow-hidden"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3 flex-shrink-0">
            {cadenceConfigs.map(({ id, label }) => (
              <TabsTrigger key={id} value={id}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="flex h-full min-h-0 flex-col gap-6">
              {cadenceConfigs.map(({ id }) => (
                <TabsContent key={id} value={id} className="flex-1 min-h-0">
                  <TableView
                    metrics={metricsByCadence.get(id) ?? []}
                    onMetricClick={handleMetricClick}
                    onNoteClick={handleNoteClick}
                    onArchiveMetric={handleArchiveMetric}
                    scorecardId={scorecard.id}
                    employees={employees}
                    currentUserId={currentUserId}
                  />
                </TabsContent>
              ))}

              {expandArchived && (
                <ArchivedMetricsSection
                  archivedMetrics={archivedMetrics}
                  scorecardId={scorecard.id}
                  employees={employees}
                  shouldExpand={true}
                  onExpandChange={setExpandArchived}
                />
              )}
            </div>
          </div>
        </Tabs>
      </div>

      <AddMetricModal
        open={showAddMetricModal}
        onOpenChange={setShowAddMetricModal}
        scorecardId={scorecard.id}
        employees={employees}
        currentUserId={currentUserId}
      />

      {selectedMetric && !noteModalState && (
        <DetailModal
          metric={selectedMetric}
          scorecardId={scorecard.id}
          currentPeriodStart={getCurrentPeriod()}
          onClose={() => setSelectedMetric(null)}
        />
      )}

      {noteModalState && (
        <NoteModal
          metric={noteModalState.metric}
          entry={noteModalState.entry}
          scorecardId={scorecard.id}
          onClose={() => setNoteModalState(null)}
        />
      )}

      <EditScorecardSheet
        open={showEditSheet}
        onOpenChange={setShowEditSheet}
        scorecard={scorecard}
        employees={employees}
        currentUserId={currentUserId}
      />

      <ArchiveMetricDialog
        open={!!metricToArchive}
        onOpenChange={(open) => !open && setMetricToArchive(null)}
        metric={metricToArchive}
        scorecardId={scorecard.id}
      />

      <DeleteScorecardDialog
        open={showDeleteScorecardDialog}
        onOpenChange={setShowDeleteScorecardDialog}
        scorecardId={scorecard.id}
        scorecardName={scorecard.name}
      />
    </div>
  )
}
