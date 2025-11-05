import Link from 'next/link'

import { requireUser } from '@/lib/auth/session'
import { loadScorecardAggregate } from '@/lib/loaders/scorecard'
import { ScorecardView } from './components/scorecard-view'

export default async function ScorecardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireUser({ redirectTo: '/login' })
  const { data, error } = await loadScorecardAggregate({
    supabase,
    scorecardId: id,
    userId: user.id,
  })

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error Loading Scorecard
          </h2>
          <p className="text-red-700">{error || 'Scorecard not found'}</p>
          <Link href="/scorecards" className="text-red-800 hover:text-red-900 underline mt-4 inline-block">
            ← Back to Scorecards
          </Link>
        </div>
      </div>
    )
  }

  const { scorecard, metrics, archivedMetrics = [], employees } = data

  return (
    <ScorecardView
      scorecard={scorecard}
      metrics={metrics}
      archivedMetrics={archivedMetrics}
      employees={employees}
      currentUserId={user.id}
    />
  )
}
