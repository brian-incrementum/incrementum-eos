'use client'

import type { ReactNode, RefObject } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, MessageSquare, Pencil } from 'lucide-react'
import type { Tables } from '@/lib/types/database.types'
import {
  formatValue,
  formatGoal,
  getStatusColor,
  getStatusClasses,
  getAverage,
  getInitials,
} from '@/lib/utils/scorecard-ui-helpers'
import { parseISODate } from '@/lib/utils/date-helpers'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>
type Profile = Tables<'profiles'>

interface MetricWithEntries extends Metric {
  entries: MetricEntry[]
  owner?: Profile | null
}

interface EditingCell {
  metricId: string
  periodStart: string
}

interface SortableMetricRowProps {
  metric: MetricWithEntries
  displayPeriods: string[]
  editingCell: EditingCell | null
  editValue: string
  selectedMetricIds: Set<string>
  columnWidths: {
    checkbox: number
    dragHandle: number
    title: number
    goal: number
    average: number
    period: number
  }
  onMetricClick: (metric: MetricWithEntries) => void
  onEditMetricClick: (e: React.MouseEvent, metric: MetricWithEntries) => void
  onToggleMetricSelection: (metricId: string) => void
  onCellClick: (metric: MetricWithEntries, periodStart: string, entry: MetricEntry | null) => void
  onCellContextMenu: (e: React.MouseEvent, metric: MetricWithEntries, entry: MetricEntry | null) => void
  onSaveEdit: (metric: MetricWithEntries, periodStart: string) => void
  onKeyDown: (e: React.KeyboardEvent, metric: MetricWithEntries, periodStart: string) => void
  onEditValueChange: (value: string) => void
  inputRef: RefObject<HTMLInputElement | null>
}

export function SortableMetricRow({
  metric,
  displayPeriods,
  editingCell,
  editValue,
  selectedMetricIds,
  columnWidths,
  onMetricClick,
  onEditMetricClick,
  onToggleMetricSelection,
  onCellClick,
  onCellContextMenu,
  onSaveEdit,
  onKeyDown,
  onEditValueChange,
  inputRef,
}: SortableMetricRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: metric.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const avg = getAverage(metric.entries)
  const entryMap = new Map(metric.entries.map((e) => [e.period_start, e]))

  return (
    <tr
      ref={setNodeRef}
      style={style}
      key={metric.id}
      className="border-b border-gray-200 hover:bg-gray-50 h-[52px]"
    >
      {/* Drag Handle Cell - Sticky */}
      <td
        className="sticky left-0 bg-white px-2 py-3 text-center border-r border-gray-200 hover:bg-gray-50"
        style={{ width: columnWidths.dragHandle, minWidth: columnWidths.dragHandle, zIndex: 10 }}
        onClick={(e) => e.stopPropagation()}
        suppressHydrationWarning
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
      </td>

      {/* Checkbox Cell - Sticky */}
      <td
        className="sticky bg-white px-3 py-3 text-center border-r border-gray-200 hover:bg-gray-50"
        style={{
          width: columnWidths.checkbox,
          minWidth: columnWidths.checkbox,
          left: columnWidths.dragHandle,
          zIndex: 10,
        }}
      >
        <Checkbox
          checked={selectedMetricIds.has(metric.id)}
          onCheckedChange={() => onToggleMetricSelection(metric.id)}
        />
      </td>

      {/* Title Cell - Sticky */}
      <td
        className="sticky bg-white px-4 py-3 border-r border-gray-200 hover:bg-gray-50"
        style={{
          width: columnWidths.title,
          minWidth: columnWidths.title,
          left: columnWidths.dragHandle + columnWidths.checkbox,
          zIndex: 10,
        }}
      >
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6 flex-shrink-0">
            {metric.owner?.avatar_url && (
              <AvatarImage
                src={metric.owner.avatar_url}
                alt={metric.owner.full_name || 'User'}
              />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(metric.owner?.full_name || null)}
            </AvatarFallback>
          </Avatar>
          <span
            className="font-medium text-gray-900 truncate cursor-pointer"
            onClick={() => onMetricClick(metric)}
          >
            {metric.name}
          </span>
          <button
            onClick={(e) => onEditMetricClick(e, metric)}
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
          left: columnWidths.dragHandle + columnWidths.checkbox + columnWidths.title,
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
          left: columnWidths.dragHandle + columnWidths.checkbox + columnWidths.title + columnWidths.goal,
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
        const classes = entry
          ? getStatusClasses(status)
          : { bg: 'bg-gray-50', text: 'text-gray-400' }

        return (
          <td
            key={idx}
            className={`px-0 py-0 text-center border-r border-gray-200 ${classes.bg} ${classes.text} font-medium relative cursor-pointer overflow-hidden`}
            style={{ width: columnWidths.period, minWidth: columnWidths.period }}
            onClick={() => !isEditing && onCellClick(metric, periodStart, entry || null)}
            onContextMenu={(e) => onCellContextMenu(e, metric, entry || null)}
          >
            <div className="flex h-12 w-full items-center justify-center px-3">
              {isEditing ? (
                metric.scoring_mode === 'yes_no' ? (
                  <div className="flex items-center justify-center gap-2">
                    <input
                      ref={inputRef}
                      type="checkbox"
                      checked={editValue === '1'}
                      onChange={(e) => onEditValueChange(e.target.checked ? '1' : '0')}
                      onBlur={() => onSaveEdit(metric, periodStart)}
                      onKeyDown={(e) => onKeyDown(e, metric, periodStart)}
                      className="h-4 w-4 rounded border border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm">{editValue === '1' ? 'Yes' : 'No'}</span>
                  </div>
                ) : (
                  <input
                    ref={inputRef}
                    type="number"
                    step="any"
                    value={editValue}
                    onChange={(e) => onEditValueChange(e.target.value)}
                    onBlur={() => onSaveEdit(metric, periodStart)}
                    onKeyDown={(e) => onKeyDown(e, metric, periodStart)}
                    className="h-9 w-full rounded-md border border-blue-300 bg-blue-50 px-2 text-center text-sm font-medium text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )
              ) : (
                <div className="flex items-center justify-center gap-1">
                  {entry ? formatValue(entry.value, metric.unit, metric) : '-'}
                  {entry?.note && <MessageSquare className="h-3 w-3 text-blue-600" />}
                </div>
              )}
            </div>
          </td>
        )
      })}
    </tr>
  )
}
