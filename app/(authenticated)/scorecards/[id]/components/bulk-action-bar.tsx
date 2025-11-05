'use client'

import { Archive, X } from 'lucide-react'

interface BulkActionBarProps {
  selectedCount: number
  onClearSelection: () => void
  onArchive: () => void
}

export function BulkActionBar({ selectedCount, onClearSelection, onArchive }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 px-6 py-4 flex items-center gap-4">
        <div className="text-sm font-medium text-gray-700">
          {selectedCount} {selectedCount === 1 ? 'metric' : 'metrics'} selected
        </div>

        <div className="h-6 w-px bg-gray-300" />

        <button
          onClick={onClearSelection}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors flex items-center gap-1.5"
        >
          <X className="w-4 h-4" />
          Clear
        </button>

        <button
          onClick={onArchive}
          className="px-4 py-1.5 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 transition-colors flex items-center gap-2"
        >
          <Archive className="w-4 h-4" />
          Archive Selected
        </button>
      </div>
    </div>
  )
}
