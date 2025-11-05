'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { archiveMetric } from '@/lib/actions/metrics'
import type { Tables } from '@/lib/types/database.types'

type Metric = Tables<'metrics'>

interface ArchiveMetricDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: Metric | null
  scorecardId: string
}

export function ArchiveMetricDialog({
  open,
  onOpenChange,
  metric,
  scorecardId,
}: ArchiveMetricDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [archiveReason, setArchiveReason] = useState('')

  const handleArchive = async () => {
    if (!metric) return

    setError(null)

    startTransition(async () => {
      const result = await archiveMetric(metric.id, scorecardId, archiveReason.trim() || undefined)

      if (result.success) {
        setArchiveReason('')
        onOpenChange(false)
      } else {
        setError(result.error || 'Failed to archive metric')
      }
    })
  }

  if (!metric) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setArchiveReason('')
        setError(null)
      }
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Archive Metric</DialogTitle>
          <DialogDescription>
            Archive this metric to remove it from your scorecard while preserving all historical data.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
            <p className="text-sm font-medium text-orange-800">
              Metric to archive: <span className="font-semibold">{metric.name}</span>
            </p>
            <p className="text-sm text-orange-700 mt-2">
              All historical data and entries will be preserved. You can restore this metric later.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="archive-reason" className="text-sm font-medium text-gray-700">
              Reason (optional)
            </label>
            <textarea
              id="archive-reason"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="e.g., Replaced by new metric, No longer relevant, etc."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-100 h-10 px-4 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Archiving...' : 'Archive Metric'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
