'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteScorecard } from '@/lib/actions/scorecards'

interface DeleteScorecardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scorecardId: string
  scorecardName: string
}

export function DeleteScorecardDialog({
  open,
  onOpenChange,
  scorecardId,
  scorecardName,
}: ArchiveScorecardDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)

    startTransition(async () => {
      const result = await deleteScorecard(scorecardId)

      if (result.success) {
        onOpenChange(false)
        // Redirect to scorecards list after successful deletion
        // Use replace to avoid going back to deleted scorecard
        router.replace('/scorecards')
      } else {
        setError(result.error || 'Failed to delete scorecard')
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setError(null)
        }
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Scorecard</DialogTitle>
          <DialogDescription>
            Permanently delete this scorecard and all associated data.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm font-medium text-red-800">
              Scorecard to delete: <span className="font-semibold">{scorecardName}</span>
            </p>
            <p className="text-sm text-red-700 mt-2">
              All metrics, members, and historical data will be permanently deleted. This action
              cannot be undone.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm font-medium text-yellow-800">Warning</p>
            <p className="text-sm text-yellow-700 mt-1">
              This will permanently remove all data associated with this scorecard.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-100 h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Deleting...' : 'Delete Scorecard'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
