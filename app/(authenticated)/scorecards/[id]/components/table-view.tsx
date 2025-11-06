'use client'

import { useState, useTransition, useRef, useEffect, useOptimistic } from 'react'
import type { ReactNode } from 'react'
import { MessageSquare, Pencil, GripVertical } from 'lucide-react'
import type { Tables } from '@/lib/types/database.types'
import type { EmployeeWithProfile } from '@/lib/actions/employees'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  formatValue,
  formatGoal,
  formatPeriod,
  getStatusColor,
  getStatusClasses,
  getAverage,
  getInitials,
} from '@/lib/utils/scorecard-ui-helpers'
import { upsertMetricEntry, deleteMetricEntry } from '@/lib/actions/metric-entries'
import { archiveMetric, reorderMetrics } from '@/lib/actions/metrics'
import { getLastNPeriods, parseISODate } from '@/lib/utils/date-helpers'
import { ContextMenu } from './context-menu'
import { ColumnResizeHandle } from './column-resize-handle'
import { EditMetricModal } from '../edit-metric-modal'
import { Checkbox } from '@/components/ui/checkbox'
import { BulkActionBar } from './bulk-action-bar'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { SortableMetricRow } from './sortable-metric-row'

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
  onArchiveMetric: (metric: MetricWithEntries) => void
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

export function TableView({ metrics, onMetricClick, onNoteClick, onArchiveMetric, scorecardId, employees, currentUserId }: TableViewProps) {
  const [orderedMetrics, setOrderedMetrics] = useState(metrics)
  const [isReordering, setIsReordering] = useState(false)
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [editMetricModalOpen, setEditMetricModalOpen] = useState(false)
  const [selectedMetricForEdit, setSelectedMetricForEdit] = useState<MetricWithEntries | null>(null)
  const [selectedMetricIds, setSelectedMetricIds] = useState<Set<string>>(new Set())
  const [columnWidths, setColumnWidths] = useState({
    dragHandle: 36,
    checkbox: 40,
    title: 160,
    goal: 100,
    average: 100,
    period: 100,
  })
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Update ordered metrics when props change
  useEffect(() => {
    setOrderedMetrics(metrics)
  }, [metrics])

  // Optimistic state for instant UI updates
  const [optimisticMetrics, setOptimisticMetrics] = useOptimistic(
    orderedMetrics,
    (state, { metricId, periodStart, value, note }: { metricId: string; periodStart: string; value: number | null; note?: string | null }) => {
      return state.map(metric => {
        if (metric.id !== metricId) return metric

        // Handle deletion (value is null)
        if (value === null) {
          return {
            ...metric,
            entries: metric.entries.filter(e => e.period_start !== periodStart)
          }
        }

        // Handle upsert
        const existingEntryIndex = metric.entries.findIndex(e => e.period_start === periodStart)

        if (existingEntryIndex >= 0) {
          // Update existing entry
          const newEntries = [...metric.entries]
          newEntries[existingEntryIndex] = {
            ...newEntries[existingEntryIndex],
            value,
            note: note !== undefined ? note : newEntries[existingEntryIndex].note,
          }
          return { ...metric, entries: newEntries }
        } else {
          // Add new entry
          return {
            ...metric,
            entries: [
              ...metric.entries,
              {
                id: `temp-${Date.now()}`, // Temporary ID
                metric_id: metricId,
                period_start: periodStart,
                value,
                note: note || null,
                created_at: new Date().toISOString(),
                created_by: currentUserId,
              } as MetricEntry
            ]
          }
        }
      })
    }
  )

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  // Selection helper functions
  const toggleMetricSelection = (metricId: string) => {
    setSelectedMetricIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(metricId)) {
        newSet.delete(metricId)
      } else {
        newSet.add(metricId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedMetricIds.size === metrics.length) {
      // All selected, deselect all
      setSelectedMetricIds(new Set())
    } else {
      // Some or none selected, select all
      setSelectedMetricIds(new Set(metrics.map(m => m.id)))
    }
  }

  const clearSelection = () => {
    setSelectedMetricIds(new Set())
  }

  const getSelectedMetrics = () => {
    return metrics.filter(m => selectedMetricIds.has(m.id))
  }

  const isAllSelected = metrics.length > 0 && selectedMetricIds.size === metrics.length
  const isSomeSelected = selectedMetricIds.size > 0 && selectedMetricIds.size < metrics.length

  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No metrics for this period</p>
      </div>
    )
  }

  // Get the last N periods based on cadence (uses configured count per cadence)
  const cadence = metrics[0]?.cadence || 'weekly'
  const displayPeriods = getLastNPeriods(cadence)

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

  const handleSaveEdit = async (metric: MetricWithEntries, periodStart: string) => {
    // Check if user wants to delete the entry (empty value)
    if (editValue.trim() === '') {
      // Find the existing entry to see if there's something to delete
      const existingEntry = metric.entries.find(e => e.period_start === periodStart)

      if (existingEntry) {
        setEditingCell(null)

        // Delete in background with optimistic update
        startTransition(async () => {
          // Optimistically delete the entry
          setOptimisticMetrics({ metricId: metric.id, periodStart, value: null })

          const result = await deleteMetricEntry(metric.id, periodStart, metric.scorecard_id)

          if (!result.success) {
            alert(result.error || 'Failed to delete entry')
            // Note: Server revalidation will restore the correct state
          }
        })
      } else {
        // Nothing to delete, just cancel
        setEditingCell(null)
      }
      return
    }

    const newValue = parseFloat(editValue)
    if (isNaN(newValue)) {
      setEditingCell(null)
      return
    }

    // Find the existing entry to preserve its note
    const existingEntry = metric.entries.find(e => e.period_start === periodStart)

    setEditingCell(null)

    const formData = new FormData()
    formData.append('value', editValue)
    formData.append('period_start', periodStart)

    // Preserve the existing note if there is one
    if (existingEntry?.note) {
      formData.append('note', existingEntry.note)
    }

    // Save in background with optimistic update
    startTransition(async () => {
      // Optimistically update the UI immediately
      setOptimisticMetrics({
        metricId: metric.id,
        periodStart,
        value: newValue,
        note: existingEntry?.note || null
      })

      const result = await upsertMetricEntry(metric.id, metric.scorecard_id, formData)

      if (!result.success) {
        alert(result.error || 'Failed to save value')
        // Note: Server revalidation will restore the correct state
      }
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    // Optimistically update the UI
    setOrderedMetrics((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })

    // Update display_order in database
    setIsReordering(true)
    try {
      const oldIndex = orderedMetrics.findIndex((item) => item.id === active.id)
      const newIndex = orderedMetrics.findIndex((item) => item.id === over.id)
      const reorderedMetrics = arrayMove(orderedMetrics, oldIndex, newIndex)

      // Create update payload with new display_order values
      const updates = reorderedMetrics.map((metric, index) => ({
        id: metric.id,
        display_order: index,
      }))

      const result = await reorderMetrics(updates, scorecardId)

      if (!result.success) {
        console.error('Failed to reorder metrics:', result.error)
        // Revert optimistic update
        setOrderedMetrics(metrics)
      }
    } catch (error) {
      console.error('Error reordering metrics:', error)
      // Revert optimistic update
      setOrderedMetrics(metrics)
    } finally {
      setIsReordering(false)
    }
  }

  const handleBulkArchive = async () => {
    const selectedMetrics = getSelectedMetrics()
    if (selectedMetrics.length === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to archive ${selectedMetrics.length} ${selectedMetrics.length === 1 ? 'metric' : 'metrics'}?`
    )

    if (!confirmed) return

    startTransition(async () => {
      let errorCount = 0

      for (const metric of selectedMetrics) {
        const result = await archiveMetric(metric.id, scorecardId)
        if (!result.success) {
          errorCount++
        }
      }

      if (errorCount > 0) {
        alert(`Failed to archive ${errorCount} ${errorCount === 1 ? 'metric' : 'metrics'}`)
      } else {
        // Scroll to archived section after successful archive
        setTimeout(() => {
          const archivedSection = document.querySelector('[data-archived-metrics-section]')
          if (archivedSection) {
            archivedSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 500)
      }

      // Clear selection after successful archive
      clearSelection()
    })
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-hidden w-full">
        <div className="overflow-x-auto w-full" suppressHydrationWarning>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  {/* Drag Handle Column - Sticky */}
                  <th
                    className="sticky left-0 bg-gray-50 px-2 py-3 text-center border-r border-gray-200"
                    style={{ width: columnWidths.dragHandle, minWidth: columnWidths.dragHandle, zIndex: 20 }}
                  >
                    <GripVertical className="size-4 mx-auto text-gray-400" />
                  </th>

                  {/* Checkbox Column - Sticky */}
                  <th
                    className="sticky bg-gray-50 px-3 py-3 text-center border-r border-gray-200"
                    style={{
                      width: columnWidths.checkbox,
                      minWidth: columnWidths.checkbox,
                      left: columnWidths.dragHandle,
                      zIndex: 20,
                    }}
                  >
                    <Checkbox
                      checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>

                  {/* Title Column - Sticky */}
                  <th
                    className="sticky bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-r border-gray-200 relative"
                    style={{
                      width: columnWidths.title,
                      minWidth: columnWidths.title,
                      left: columnWidths.dragHandle + columnWidths.checkbox,
                      zIndex: 20,
                    }}
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
                      left: columnWidths.dragHandle + columnWidths.checkbox + columnWidths.title,
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
                      left: columnWidths.dragHandle + columnWidths.checkbox + columnWidths.title + columnWidths.goal,
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
                  const date = parseISODate(periodStart)
                  let headerContent: ReactNode

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
              <SortableContext
                items={optimisticMetrics.map((metric) => metric.id)}
                strategy={verticalListSortingStrategy}
              >
                {optimisticMetrics.map((metric) => (
                  <SortableMetricRow
                    key={metric.id}
                    metric={metric}
                    displayPeriods={displayPeriods}
                    editingCell={editingCell}
                    editValue={editValue}
                    selectedMetricIds={selectedMetricIds}
                    columnWidths={columnWidths}
                    onMetricClick={onMetricClick}
                    onEditMetricClick={handleEditMetricClick}
                    onToggleMetricSelection={toggleMetricSelection}
                    onCellClick={handleCellClick}
                    onCellContextMenu={handleCellContextMenu}
                    onSaveEdit={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    onEditValueChange={setEditValue}
                    inputRef={inputRef}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
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

      <BulkActionBar
        selectedCount={selectedMetricIds.size}
        onClearSelection={clearSelection}
        onArchive={handleBulkArchive}
      />
    </>
  )
}
