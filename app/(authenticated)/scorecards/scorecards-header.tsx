'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CreateScorecardModal } from './create-scorecard-modal'
import { EmptyState } from './empty-state'

interface ScorecardsHeaderProps {
  hasScorecard: boolean
  isAdmin: boolean
}

export function ScorecardsHeader({ hasScorecard, isAdmin }: ScorecardsHeaderProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [initialTeamId, setInitialTeamId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  // Auto-open modal when create=true parameter is present
  useEffect(() => {
    const shouldCreate = searchParams.get('create') === 'true'
    if (shouldCreate) {
      // Capture team_id before cleaning up URL
      const teamId = searchParams.get('team_id')
      setInitialTeamId(teamId)
      setIsCreateModalOpen(true)

      // Delay URL cleanup to ensure modal can read searchParams
      setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        params.delete('create')
        const newUrl = params.toString() ? `/scorecards?${params.toString()}` : '/scorecards'
        router.replace(newUrl, { scroll: false })
      }, 100)
    }
  }, [searchParams, router])

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Scorecards</h1>
          <p className="mt-2 text-gray-600">
            Track your metrics and goals across all your scorecards
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <svg
              className="-ml-0.5 mr-1.5 h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            New Scorecard
          </button>
        )}
      </div>

      {/* Empty State */}
      {!hasScorecard && isAdmin && (
        <EmptyState onCreateClick={() => setIsCreateModalOpen(true)} />
      )}

      {/* Create Modal */}
      <CreateScorecardModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        isAdmin={isAdmin}
      />
    </>
  )
}
