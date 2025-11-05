'use client'

import { useEffect, useRef } from 'react'
import { MessageSquare } from 'lucide-react'
import type { Tables } from '@/lib/types/database.types'

type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>

interface ContextMenuProps {
  x: number
  y: number
  metric: Metric
  entry: MetricEntry | null
  onAddNote: () => void
  onClose: () => void
}

export function ContextMenu({ x, y, metric, entry, onAddNote, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const hasNote = entry?.note && entry.note.trim().length > 0

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px] z-50"
      style={{ left: x, top: y }}
    >
      <button
        onClick={() => {
          onAddNote()
          onClose()
        }}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
      >
        <MessageSquare className="w-4 h-4 text-gray-600" />
        {hasNote ? 'Edit Note' : 'Add Note'}
      </button>

      {hasNote && entry?.note && (
        <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 max-w-xs">
          <div className="font-medium mb-1">Current note:</div>
          <div className="italic truncate">{entry.note}</div>
        </div>
      )}
    </div>
  )
}
