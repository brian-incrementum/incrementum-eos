import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrganizedScorecards } from '@/lib/actions/scorecards'
import { ScorecardsTable } from './scorecards-table'
import { ScorecardsHeader } from './scorecards-header'

export default async function ScorecardsPage() {
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is system admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_system_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.is_system_admin || false

  // Fetch organized scorecards
  const { yourScorecards, companyScorecards, error} = await getOrganizedScorecards()

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
      />

      {/* Your Scorecards Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Scorecards</h2>
        <ScorecardsTable
          scorecards={yourScorecards}
          emptyMessage="You don't have any scorecards yet. Create one to get started!"
        />
      </section>

      {/* Company Scorecards Section */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Scorecards</h2>
        <ScorecardsTable
          scorecards={companyScorecards}
          emptyMessage="No other company scorecards available."
        />
      </section>
    </div>
  )
}
