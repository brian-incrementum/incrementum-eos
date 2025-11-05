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
import { hardDeleteMetric } from '@/lib/actions/metrics'
import type { Tables } from '@/lib/types/database.types'
import { AlertTriangle } from 'lucide-react'

type Metric = Tables<'metrics'>

interface PermanentDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: Metric | null
  scorecardId: string
}

export function PermanentDeleteDialog({
  open,
  onOpenChange,
  metric,
  scorecardId,
}: PermanentDeleteDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmationText, setConfirmationText] = useState('')

  const handleDelete = async () => {
    if (!metric) return

    // Verify confirmation text matches metric name
    if (confirmationText !== metric.name) {
      setError('Metric name does not match')
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await hardDeleteMetric(metric.id, scorecardId)

      if (result.success) {
        setConfirmationText('')
        onOpenChange(false)
      } else {
        setError(result.error || 'Failed to permanently delete metric')
      }
    })
  }

  const isConfirmationValid = metric && confirmationText === metric.name

  if (!metric) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setConfirmationText('')
        setError(null)
      }
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Permanently Delete Metric
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. All historical data will be permanently lost.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-red-50 border-2 border-red-300 rounded-md p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-bold text-red-900">
                  WARNING: This will permanently delete:
                </p>
                <ul className="text-sm text-red-800 list-disc list-inside space-y-1 ml-2">
                  <li>The metric: <span className="font-semibold">{metric.name}</span></li>
                  <li>All historical entries and data</li>
                  <li>All notes and values associated with this metric</li>
                </ul>
                <p className="text-sm font-medium text-red-900 mt-3">
                  This data cannot be recovered after deletion.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmation" className="text-sm font-medium text-gray-900">
              To confirm, type the metric name: <span className="font-mono bg-gray-100 px-1 py-0.5 rounded">{metric.name}</span>
            </label>
            <input
              id="confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value)
                setError(null)
              }}
              placeholder="Type metric name here"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
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
            disabled={isPending || !isConfirmationValid}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Deleting...' : 'Permanently Delete'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
