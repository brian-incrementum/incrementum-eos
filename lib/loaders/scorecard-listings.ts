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
}

export async function loadScorecardListings({
  supabase,
  userId,
}: LoadScorecardListingsOptions): Promise<{
  yourScorecards: ScorecardWithDetails[]
  companyScorecards: ScorecardWithDetails[]
  error: string | null
}> {
  const [
    { data: scorecardsData, error: scorecardsError },
    { data: memberRows, error: membershipError },
    { data: metricRows, error: metricsError },
    { data: directReports, error: directReportsError },
    { data: teamOwners, error: teamOwnersError },
    { data: userTeamMemberships, error: userTeamMembershipsError },
  ] = await Promise.all([
    supabase
      .from('scorecards')
      .select(
        `
          *,
          owner:profiles!scorecards_owner_user_id_fkey(*),
          team:teams(*),
          role:roles(*)
        `
      )
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
    // Get user's direct reports (people who report to this user)
    supabase
      .from('profiles')
      .select('id')
      .eq('manager_id', userId),
    // Get all team owners
    supabase
      .from('team_members')
      .select('team_id, user_id')
      .eq('role', 'owner'),
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

  if (directReportsError) {
    console.error('Error fetching direct reports', directReportsError)
  }

  if (teamOwnersError) {
    console.error('Error fetching team owners', teamOwnersError)
  }

  if (userTeamMembershipsError) {
    console.error('Error fetching user team memberships', userTeamMembershipsError)
  }

  const yourScorecardIds = new Set<string>()
  const metricCountByScorecard = new Map<string, number>()

  // Create a set of direct report user IDs
  const directReportIds = new Set<string>()
  directReports?.forEach((profile) => {
    directReportIds.add(profile.id)
  })

  // Create a map of team_id -> owner_user_id
  const teamOwnerByTeamId = new Map<string, string>()
  teamOwners?.forEach((teamMember) => {
    if (teamMember.team_id && teamMember.user_id) {
      teamOwnerByTeamId.set(teamMember.team_id, teamMember.user_id)
    }
  })

  // Create a set of team IDs where the user is a member
  const userTeamIds = new Set<string>()
  userTeamMemberships?.forEach((membership) => {
    if (membership.team_id) {
      userTeamIds.add(membership.team_id)
    }
  })

  const scorecards = (scorecardsData ?? []) as ScorecardRow[]

  scorecards.forEach((scorecard) => {
    if (scorecard.owner_user_id === userId) {
      yourScorecardIds.add(scorecard.id)
    }

    // Check if this is a team scorecard where the user is a member
    if (scorecard.type === 'team' && scorecard.team_id && userTeamIds.has(scorecard.team_id)) {
      yourScorecardIds.add(scorecard.id)
    }

    // Check if this is a team scorecard where the user manages the team owner
    if (
      scorecard.type === 'team' &&
      scorecard.team_id &&
      teamOwnerByTeamId.has(scorecard.team_id)
    ) {
      const teamOwnerId = teamOwnerByTeamId.get(scorecard.team_id)
      if (teamOwnerId && directReportIds.has(teamOwnerId)) {
        yourScorecardIds.add(scorecard.id)
      }
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
      owner: scorecard.owner ?? null,
      team: scorecard.team ?? null,
      role: scorecard.role ?? null,
      metric_count: metricCountByScorecard.get(scorecard.id) ?? 0,
    }

    if (yourScorecardIds.has(scorecard.id)) {
      yourScorecards.push(enhanced)
    } else {
      companyScorecards.push(enhanced)
    }
  })

  return {
    yourScorecards,
    companyScorecards,
    error: null,
  }
}
