import { Loader2 } from 'lucide-react'

/**
 * Minimal loading indicator for scorecard detail page
 * Shows briefly during navigation - optimizations make this rarely visible
 */
export default function ScorecardDetailLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">Loading scorecard...</p>
      </div>
    </div>
  )
}
