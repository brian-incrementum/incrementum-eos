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
import { deleteMetric } from '@/lib/actions/metrics'
import type { Tables } from '@/lib/types/database.types'

type Metric = Tables<'metrics'>

interface DeleteMetricDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: Metric | null
  scorecardId: string
}

export function DeleteMetricDialog({
  open,
  onOpenChange,
  metric,
  scorecardId,
}: DeleteMetricDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!metric) return

    setError(null)

    startTransition(async () => {
      const result = await deleteMetric(metric.id, scorecardId)

      if (result.success) {
        onOpenChange(false)
      } else {
        setError(result.error || 'Failed to delete metric')
      }
    })
  }

  if (!metric) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Metric</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this metric? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm font-medium text-red-800">
              Metric to delete: <span className="font-semibold">{metric.name}</span>
            </p>
            <p className="text-sm text-red-700 mt-2">
              All associated data and entries will be preserved but this metric will no longer appear in your scorecard.
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
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
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Deleting...' : 'Delete Metric'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
