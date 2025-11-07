import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/types/database.types'
import type {
  ProfileTable,
  RoleTable,
  ScorecardTable,
  ScorecardWithDetails,
  TeamTable,
} from '@/lib/types/scorecards'

type Scorecard = ScorecardTable
type Profile = ProfileTable
type Team = TeamTable
type Role = RoleTable

type ScorecardRow = Scorecard & {
  owner: Profile | null
  team: Team | null
  role: Role | null
}

type MemberRow = {
  scorecard_id: string
}

type MetricRow = {
  scorecard_id: string
  owner_user_id: string | null
}

interface LoadScorecardListingsOptions {
  supabase: SupabaseClient<Database>
  userId: string
  isAdmin?: boolean
}

export async function loadScorecardListings({
  supabase,
  userId,
  isAdmin = false,
}: LoadScorecardListingsOptions): Promise<{
  yourScorecards: ScorecardWithDetails[]
  companyScorecards: ScorecardWithDetails[]
  error: string | null
}> {
  const [
    { data: scorecardsData, error: scorecardsError },
    { data: memberRows, error: membershipError },
    { data: metricRows, error: metricsError },
    { data: userTeamMemberships, error: userTeamMembershipsError },
  ] = await Promise.all([
    // Fetch only owner profile (critical for display), skip team/role for performance
    supabase
      .from('scorecards')
      .select(`
        *,
        owner:profiles!scorecards_owner_user_id_fkey(id, full_name, email)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('scorecard_members')
      .select('scorecard_id')
      .eq('user_id', userId),
    supabase
      .from('metrics')
      .select('scorecard_id, owner_user_id')
      .eq('is_active', true),
    // Get all teams where the current user is a member (any role)
    supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId),
  ])

  if (scorecardsError) {
    console.error('Error fetching scorecards', scorecardsError)
    return {
      yourScorecards: [],
      companyScorecards: [],
      error: scorecardsError.message,
    }
  }

  if (membershipError) {
    console.error('Error fetching scorecard memberships', membershipError)
  }

  if (metricsError) {
    console.error('Error fetching scorecard metrics', metricsError)
  }

  if (userTeamMembershipsError) {
    console.error('Error fetching user team memberships', userTeamMembershipsError)
  }

  const yourScorecardIds = new Set<string>()
  const metricCountByScorecard = new Map<string, number>()

  // Create a set of team IDs where the user is a member
  const userTeamIds = new Set<string>()
  userTeamMemberships?.forEach((membership) => {
    if (membership.team_id) {
      userTeamIds.add(membership.team_id)
    }
  })

  const scorecards = (scorecardsData ?? []) as ScorecardRow[]

  scorecards.forEach((scorecard) => {
    // User owns the scorecard
    if (scorecard.owner_user_id === userId) {
      yourScorecardIds.add(scorecard.id)
    }

    // User is a member of the team that owns this scorecard
    if (scorecard.type === 'team' && scorecard.team_id && userTeamIds.has(scorecard.team_id)) {
      yourScorecardIds.add(scorecard.id)
    }
  })

  memberRows?.forEach((row: MemberRow) => {
    if (row.scorecard_id) {
      yourScorecardIds.add(row.scorecard_id)
    }
  })

  metricRows?.forEach((row: MetricRow) => {
    if (!row.scorecard_id) {
      return
    }

    metricCountByScorecard.set(row.scorecard_id, (metricCountByScorecard.get(row.scorecard_id) || 0) + 1)

    if (row.owner_user_id === userId) {
      yourScorecardIds.add(row.scorecard_id)
    }
  })

  const yourScorecards: ScorecardWithDetails[] = []
  const companyScorecards: ScorecardWithDetails[] = []

  scorecards.forEach((scorecard) => {
    const enhanced: ScorecardWithDetails = {
      ...scorecard,
      owner: scorecard.owner ?? null, // Owner profile included for display
      team: null, // Removed for performance - type badge is sufficient
      role: null, // Removed for performance - type badge is sufficient
      metric_count: metricCountByScorecard.get(scorecard.id) ?? 0,
    }

    if (yourScorecardIds.has(scorecard.id)) {
      yourScorecards.push(enhanced)
    } else if (isAdmin) {
      // Admins can see all scorecards in the Company Scorecards section
      companyScorecards.push(enhanced)
    }
    // Non-admins only see scorecards they have direct access to
  })

  return {
    yourScorecards,
    companyScorecards,
    error: null,
  }
}
