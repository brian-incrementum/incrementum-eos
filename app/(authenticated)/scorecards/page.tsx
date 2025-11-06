import { requireUser } from '@/lib/auth/session'
import { loadScorecardListings } from '@/lib/loaders/scorecard-listings'
import { isSystemAdmin } from '@/lib/auth/permissions'
import { ScorecardsTable } from './scorecards-table'
import { ScorecardsHeader } from './scorecards-header'
import { TEAM_ROLES } from '@/lib/auth/constants'

// Enable ISR: Cache this page for 60 seconds for faster subsequent loads
export const revalidate = 60

export default async function ScorecardsPage() {
  const { supabase, user } = await requireUser({ redirectTo: '/login' })

  const isAdmin = await isSystemAdmin(user.id, supabase)

  // Check if user owns any teams (simplified permission)
  const { data: ownedTeams } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('role', TEAM_ROLES.OWNER)
    .limit(1)

  const canCreate = isAdmin || ((ownedTeams?.length ?? 0) > 0)

  // Fetch organized scorecards
  const { yourScorecards, companyScorecards, error } = await loadScorecardListings({
    supabase,
    userId: user.id,
    isAdmin,
  })

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Scorecards</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Create Button */}
      <ScorecardsHeader
        hasScorecard={yourScorecards.length > 0 || companyScorecards.length > 0}
        isAdmin={isAdmin}
        canCreateScorecard={canCreate}
      />

      {/* Your Scorecards Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {isAdmin ? 'Your Scorecards' : 'Scorecards'}
        </h2>
        <ScorecardsTable
          scorecards={yourScorecards}
          emptyMessage="You don't have any scorecards yet. Create one to get started!"
        />
      </section>

      {/* Company Scorecards Section - Only for Admins */}
      {isAdmin && companyScorecards.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Scorecards</h2>
          <ScorecardsTable
            scorecards={companyScorecards}
            emptyMessage="No other company scorecards available."
          />
        </section>
      )}
    </div>
  )
}
