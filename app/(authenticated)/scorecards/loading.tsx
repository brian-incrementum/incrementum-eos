import { Loader2 } from 'lucide-react'

/**
 * Loading indicator for scorecards list page
 * Shows during navigation to provide instant feedback
 */
export default function ScorecardsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Loading scorecards...</p>
      </div>
    </div>
  )
}
