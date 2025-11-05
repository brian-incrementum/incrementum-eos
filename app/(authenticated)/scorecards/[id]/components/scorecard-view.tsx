'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import type { Tables } from '@/lib/types/database.types'
import type { EmployeeWithProfile } from '@/lib/actions/employees'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getCurrentPeriodStart, formatPeriodDate, toISODate } from '@/lib/utils/date-helpers'
import { TableView } from './table-view'
import { DetailModal } from './detail-modal'
import { NoteModal } from './note-modal'
import { AddMetricModal } from '../add-metric-modal'
import { EditScorecardSheet } from '../edit-scorecard-sheet'

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
  employees: EmployeeWithProfile[]
  currentUserId: string
}

export function ScorecardView({ scorecard, metrics, employees, currentUserId }: ScorecardViewProps) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly')
  const [selectedMetric, setSelectedMetric] = useState<MetricWithEntries | null>(null)
  const [noteModalState, setNoteModalState] = useState<{
    metric: MetricWithEntries
    entry: MetricEntry
  } | null>(null)
  const [showAddMetricModal, setShowAddMetricModal] = useState(false)
  const [showEditSheet, setShowEditSheet] = useState(false)

  // Filter metrics by cadence
  const weeklyMetrics = metrics.filter((m) => m.cadence === 'weekly')
  const monthlyMetrics = metrics.filter((m) => m.cadence === 'monthly')
  const quarterlyMetrics = metrics.filter((m) => m.cadence === 'quarterly')

  // Get current period start for each cadence
  const currentWeekStart = toISODate(getCurrentPeriodStart('weekly'))
  const currentMonthStart = toISODate(getCurrentPeriodStart('monthly'))
  const currentQuarterStart = toISODate(getCurrentPeriodStart('quarterly'))

  // Get current period based on active tab
  const getCurrentPeriod = () => {
    switch (activeTab) {
      case 'weekly':
        return currentWeekStart
      case 'monthly':
        return currentMonthStart
      case 'quarterly':
        return currentQuarterStart
    }
  }

  // Get display label for current period
  const getCurrentPeriodLabel = () => {
    const periodStart = getCurrentPeriodStart(activeTab)
    return formatPeriodDate(periodStart, activeTab)
  }

  // Get metrics for active tab
  const getActiveMetrics = () => {
    switch (activeTab) {
      case 'weekly':
        return weeklyMetrics
      case 'monthly':
        return monthlyMetrics
      case 'quarterly':
        return quarterlyMetrics
    }
  }

  const activeMetrics = getActiveMetrics()

  const handleMetricClick = (metric: MetricWithEntries) => {
    setSelectedMetric(metric)
  }

  const handleNoteClick = (metric: MetricWithEntries, entry: MetricEntry) => {
    setNoteModalState({ metric, entry })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{scorecard.name}</h1>
            <p className="text-gray-600">{getCurrentPeriodLabel()}</p>
          </div>
          <button
            onClick={() => setShowEditSheet(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit scorecard"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'weekly' | 'monthly' | 'quarterly')}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-6">
          <TableView
            metrics={activeMetrics}
            onMetricClick={handleMetricClick}
            onNoteClick={handleNoteClick}
            scorecardId={scorecard.id}
            employees={employees}
            currentUserId={currentUserId}
          />
        </TabsContent>

        <TabsContent value="monthly" className="mt-6">
          <TableView
            metrics={activeMetrics}
            onMetricClick={handleMetricClick}
            onNoteClick={handleNoteClick}
            scorecardId={scorecard.id}
            employees={employees}
            currentUserId={currentUserId}
          />
        </TabsContent>

        <TabsContent value="quarterly" className="mt-6">
          <TableView
            metrics={activeMetrics}
            onMetricClick={handleMetricClick}
            onNoteClick={handleNoteClick}
            scorecardId={scorecard.id}
            employees={employees}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <button
          onClick={() => setShowAddMetricModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Measurable
        </button>
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
    </div>
  )
}
