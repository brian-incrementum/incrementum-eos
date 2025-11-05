'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { MessageSquare, Pencil } from 'lucide-react'
import type { Tables } from '@/lib/types/database.types'
import type { EmployeeWithProfile } from '@/lib/actions/employees'
import {
  formatValue,
  formatGoal,
  formatPeriod,
  getStatusColor,
  getStatusClasses,
  getAverage,
  getInitials,
} from '@/lib/utils/scorecard-ui-helpers'
import { upsertMetricEntry } from '@/lib/actions/metric-entries'
import { getLast8Periods } from '@/lib/utils/date-helpers'
import { ContextMenu } from './context-menu'
import { ColumnResizeHandle } from './column-resize-handle'
import { EditMetricModal } from '../edit-metric-modal'

type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>
type Profile = Tables<'profiles'>

interface MetricWithEntries extends Metric {
  entries: MetricEntry[]
  owner?: Profile | null
}

interface TableViewProps {
  metrics: MetricWithEntries[]
  onMetricClick: (metric: MetricWithEntries) => void
  onNoteClick: (metric: MetricWithEntries, entry: MetricEntry) => void
  scorecardId: string
  employees: EmployeeWithProfile[]
  currentUserId: string
}

interface EditingCell {
  metricId: string
  periodStart: string
}

interface ContextMenuState {
  x: number
  y: number
  metric: MetricWithEntries
  entry: MetricEntry | null
}

export function TableView({ metrics, onMetricClick, onNoteClick, scorecardId, employees, currentUserId }: TableViewProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [editMetricModalOpen, setEditMetricModalOpen] = useState(false)
  const [selectedMetricForEdit, setSelectedMetricForEdit] = useState<MetricWithEntries | null>(null)
  const [columnWidths, setColumnWidths] = useState({
    title: 200,
    goal: 120,
    average: 120,
    period: 120,
  })
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No metrics for this period</p>
      </div>
    )
  }

  // Get the last 8 periods based on cadence (generates all 8 periods, not just ones with data)
  const cadence = metrics[0]?.cadence || 'weekly'
  const displayPeriods = getLast8Periods(cadence)

  const handleCellClick = (metric: MetricWithEntries, periodStart: string, entry: MetricEntry | null) => {
    setEditingCell({ metricId: metric.id, periodStart })
    setEditValue(entry ? entry.value.toString() : '')
  }

  const handleCellContextMenu = (
    e: React.MouseEvent,
    metric: MetricWithEntries,
    entry: MetricEntry | null
  ) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      metric,
      entry,
    })
  }

  const handleSaveEdit = (metric: MetricWithEntries, periodStart: string) => {
    const newValue = parseFloat(editValue)
    if (isNaN(newValue)) {
      setEditingCell(null)
      return
    }

    const formData = new FormData()
    formData.append('value', editValue)
    formData.append('period_start', periodStart)

    startTransition(async () => {
      // Find the scorecard ID from the metric
      const result = await upsertMetricEntry(metric.id, metric.scorecard_id, formData)

      if (!result.success) {
        alert(result.error || 'Failed to save value')
      }

      setEditingCell(null)
    })
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, metric: MetricWithEntries, periodStart: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(metric, periodStart)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleColumnResize = (columnKey: string, width: number) => {
    setColumnWidths((prev) => ({
      ...prev,
      [columnKey]: width,
    }))
  }

  const handleEditMetricClick = (e: React.MouseEvent, metric: MetricWithEntries) => {
    e.stopPropagation()
    setSelectedMetricForEdit(metric)
    setEditMetricModalOpen(true)
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {/* Title Column - Sticky */}
                <th
                  className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 relative"
                  style={{ width: columnWidths.title, minWidth: columnWidths.title, zIndex: 20 }}
                >
                  Title
                  <ColumnResizeHandle
                    columnKey="title"
                    onResize={handleColumnResize}
                    minWidth={120}
                    maxWidth={400}
                  />
                </th>

                {/* Goal Column - Sticky */}
                <th
                  className="sticky bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 relative"
                  style={{
                    width: columnWidths.goal,
                    minWidth: columnWidths.goal,
                    left: columnWidths.title,
                    zIndex: 20,
                  }}
                >
                  Goal
                  <ColumnResizeHandle
                    columnKey="goal"
                    onResize={handleColumnResize}
                    minWidth={100}
                    maxWidth={200}
                  />
                </th>

                {/* Average Column - Sticky */}
                <th
                  className="sticky bg-gray-50 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 relative"
                  style={{
                    width: columnWidths.average,
                    minWidth: columnWidths.average,
                    left: columnWidths.title + columnWidths.goal,
                    zIndex: 20,
                  }}
                >
                  Average
                  <ColumnResizeHandle
                    columnKey="average"
                    onResize={handleColumnResize}
                    minWidth={100}
                    maxWidth={200}
                  />
                </th>

                {/* Period Columns - Scrollable */}
                {displayPeriods.map((periodStart, idx) => {
                  const date = new Date(periodStart)
                  let headerContent: JSX.Element

                  if (cadence === 'weekly') {
                    const endDate = new Date(date)
                    endDate.setDate(date.getDate() + 6)
                    const startFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    headerContent = (
                      <div className="flex flex-col">
                        <span>{startFormatted} -</span>
                        <span>{endFormatted}</span>
                      </div>
                    )
                  } else if (cadence === 'monthly') {
                    const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                    const [month, year] = monthYear.split(' ')
                    headerContent = (
                      <div className="flex flex-col">
                        <span>{month}</span>
                        <span>{year}</span>
                      </div>
                    )
                  } else {
                    // Quarterly
                    const quarter = Math.floor(date.getMonth() / 3) + 1
                    const year = date.getFullYear()
                    headerContent = (
                      <div className="flex flex-col">
                        <span>Q{quarter}</span>
                        <span>{year}</span>
                      </div>
                    )
                  }

                  return (
                    <th
                      key={idx}
                      className="bg-gray-50 px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 relative"
                      style={{ minWidth: columnWidths.period }}
                    >
                      {headerContent}
                      {idx === 0 && (
                        <ColumnResizeHandle
                          columnKey="period"
                          onResize={handleColumnResize}
                          minWidth={100}
                          maxWidth={200}
                        />
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const avg = getAverage(metric.entries)

                // Create a map of period_start to entry for quick lookup
                const entryMap = new Map(metric.entries.map((e) => [e.period_start, e]))

                return (
                  <tr key={metric.id} className="border-b border-gray-200 hover:bg-gray-50">
                    {/* Title Cell - Sticky */}
                    <td
                      className="sticky left-0 bg-white px-4 py-3 border-r border-gray-200 hover:bg-gray-50"
                      style={{ width: columnWidths.title, minWidth: columnWidths.title, zIndex: 10 }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium flex-shrink-0">
                          {getInitials(metric.owner?.full_name || null)}
                        </div>
                        <span className="font-medium text-gray-900 truncate cursor-pointer" onClick={() => onMetricClick(metric)}>{metric.name}</span>
                        <button
                          onClick={(e) => handleEditMetricClick(e, metric)}
                          className="ml-auto p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                          title="Edit metric"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Goal Cell - Sticky */}
                    <td
                      className="sticky bg-white px-4 py-3 text-center border-r border-gray-200 text-gray-700 hover:bg-gray-50"
                      style={{
                        width: columnWidths.goal,
                        minWidth: columnWidths.goal,
                        left: columnWidths.title,
                        zIndex: 10,
                      }}
                    >
                      {formatGoal(metric)}
                    </td>

                    {/* Average Cell - Sticky */}
                    <td
                      className="sticky bg-white px-4 py-3 text-center border-r border-gray-200 font-medium text-gray-900 hover:bg-gray-50"
                      style={{
                        width: columnWidths.average,
                        minWidth: columnWidths.average,
                        left: columnWidths.title + columnWidths.goal,
                        zIndex: 10,
                      }}
                    >
                      {avg > 0 ? formatValue(avg, metric.unit) : '-'}
                    </td>

                    {/* Period Cells - Scrollable */}
                    {displayPeriods.map((periodStart, idx) => {
                      const entry = entryMap.get(periodStart)
                      const isEditing =
                        editingCell?.metricId === metric.id &&
                        editingCell?.periodStart === periodStart

                      // Determine status and classes
                      const status = entry ? getStatusColor(entry.value, metric) : 'red'
                      const classes = entry ? getStatusClasses(status) : { bg: 'bg-gray-50', text: 'text-gray-400' }

                      return (
                        <td
                          key={idx}
                          className={`px-3 py-3 text-center border-r border-gray-200 ${classes.bg} ${classes.text} font-medium relative cursor-pointer`}
                          style={{ minWidth: columnWidths.period }}
                          onClick={() => !isEditing && handleCellClick(metric, periodStart, entry || null)}
                          onContextMenu={(e) => handleCellContextMenu(e, metric, entry || null)}
                        >
                          {isEditing ? (
                            metric.scoring_mode === 'yes_no' ? (
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  ref={inputRef}
                                  type="checkbox"
                                  checked={editValue === '1'}
                                  onChange={(e) => setEditValue(e.target.checked ? '1' : '0')}
                                  onBlur={() => handleSaveEdit(metric, periodStart)}
                                  onKeyDown={(e) => handleKeyDown(e, metric, periodStart)}
                                  disabled={isPending}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <span className="text-sm">{editValue === '1' ? 'Yes' : 'No'}</span>
                              </div>
                            ) : (
                              <input
                                ref={inputRef}
                                type="number"
                                step="any"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleSaveEdit(metric, periodStart)}
                                onKeyDown={(e) => handleKeyDown(e, metric, periodStart)}
                                disabled={isPending}
                                className="w-full px-1 py-0.5 text-center border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                                style={{ minWidth: '60px' }}
                              />
                            )
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {entry ? formatValue(entry.value, metric.unit, metric) : '-'}
                              {entry?.note && <MessageSquare className="w-3 h-3 text-blue-600" />}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          metric={contextMenu.metric}
          entry={contextMenu.entry}
          onAddNote={() => {
            if (contextMenu.entry) {
              onNoteClick(contextMenu.metric, contextMenu.entry)
            }
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      <EditMetricModal
        open={editMetricModalOpen}
        onOpenChange={setEditMetricModalOpen}
        metric={selectedMetricForEdit}
        scorecardId={scorecardId}
        employees={employees}
        currentUserId={currentUserId}
      />
    </>
  )
}
