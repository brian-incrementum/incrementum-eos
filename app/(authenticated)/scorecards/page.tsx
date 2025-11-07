import { requireUser } from '@/lib/auth/session'
import { loadScorecardListings } from '@/lib/loaders/scorecard-listings'
import { isSystemAdmin } from '@/lib/auth/permissions'
import { ScorecardsTable } from './scorecards-table'
import { ScorecardsHeader } from './scorecards-header'
import { TEAM_ROLES } from '@/lib/auth/constants'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

  // Split scorecards by type
  const teamScorecards = yourScorecards.filter(s => s.type === 'team')
  const roleScorecards = yourScorecards.filter(s => s.type === 'role')
  const personalScorecards = yourScorecards.filter(s => s.type === 'personal')

  return (
    <div className="space-y-8">
      {/* Header with Create Button */}
      <ScorecardsHeader
        hasScorecard={yourScorecards.length > 0 || companyScorecards.length > 0}
        isAdmin={isAdmin}
        canCreateScorecard={canCreate}
      />

      {/* Your Scorecards with Tabs */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {isAdmin ? 'Your Scorecards' : 'Scorecards'}
        </h2>

        {yourScorecards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">You don't have any scorecards yet. Create one to get started!</p>
          </div>
        ) : (
          <Tabs defaultValue="team" className="w-full">
            <TabsList>
              <TabsTrigger value="team">
                Team Scorecards ({teamScorecards.length})
              </TabsTrigger>
              <TabsTrigger value="role">
                Role Scorecards ({roleScorecards.length})
              </TabsTrigger>
              {personalScorecards.length > 0 && (
                <TabsTrigger value="personal">
                  Personal ({personalScorecards.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="team" className="mt-6">
              <ScorecardsTable
                scorecards={teamScorecards}
                emptyMessage="No team scorecards yet."
              />
            </TabsContent>

            <TabsContent value="role" className="mt-6">
              <ScorecardsTable
                scorecards={roleScorecards}
                emptyMessage="No role scorecards yet."
              />
            </TabsContent>

            {personalScorecards.length > 0 && (
              <TabsContent value="personal" className="mt-6">
                <ScorecardsTable
                  scorecards={personalScorecards}
                  emptyMessage="No personal scorecards yet."
                />
              </TabsContent>
            )}
          </Tabs>
        )}
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
