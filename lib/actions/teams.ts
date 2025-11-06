'use server'

/**
 * Team Server Actions
 * CRUD operations for teams with permission checks
 */

import { revalidatePath } from 'next/cache'

import { AuthError, requireUser } from '@/lib/auth/session'
import type { Tables } from '@/lib/types/database.types'
import {
  requireTeamPermission,
  canDeleteTeam,
  isSystemAdmin,
} from '@/lib/auth/permissions'
import { TEAM_ROLES } from '@/lib/auth/constants'

type Team = Tables<'teams'>
type TeamMember = Tables<'team_members'>
type Profile = Tables<'profiles'>
type Scorecard = Tables<'scorecards'>

interface TeamWithMembers extends Team {
  members: (TeamMember & { profile: Profile })[]
  member_count: number
  scorecard_count: number
  scorecards: Scorecard[]
}

/**
 * Get all teams for the current user
 */
export async function getUserTeams(): Promise<{
  data: TeamWithMembers[] | null
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Get teams where user is a member
    const { data: membershipRows, error: membershipError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)

    if (membershipError) {
      return { data: null, error: membershipError.message }
    }

    const teamIds = Array.from(new Set(membershipRows.map((row) => row.team_id)))

    if (teamIds.length === 0) {
      return { data: [], error: null }
    }

    // Fetch teams with member counts
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds)
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    if (teamsError) {
      return { data: null, error: teamsError.message }
    }

    // Fetch member counts and scorecard counts WITHOUT profile joins for speed
    const [memberCountsResult, scorecardRowsResult] = await Promise.all([
      supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', teamIds),
      supabase
        .from('scorecards')
        .select('id, team_id')
        .in('team_id', teamIds)
        .eq('is_active', true),
    ])

    if (memberCountsResult.error) {
      console.error('Error fetching team member counts', memberCountsResult.error)
    }

    if (scorecardRowsResult.error) {
      console.error('Error fetching team scorecards', scorecardRowsResult.error)
    }

    // Count members by team (no profile data needed for list view)
    const memberCountByTeam = new Map<string, number>()
    memberCountsResult.data?.forEach((row) => {
      memberCountByTeam.set(row.team_id, (memberCountByTeam.get(row.team_id) || 0) + 1)
    })

    const scorecardCountByTeam = new Map<string, number>()
    scorecardRowsResult.data?.forEach((row) => {
      if (!row.team_id) {
        return
      }

      scorecardCountByTeam.set(row.team_id, (scorecardCountByTeam.get(row.team_id) || 0) + 1)
    })

    const teamsWithAggregates = (teams || []).map((team) => {
      return {
        ...team,
        members: [], // Empty for list view - profiles loaded on demand
        member_count: memberCountByTeam.get(team.id) || 0,
        scorecard_count: scorecardCountByTeam.get(team.id) || 0,
        scorecards: [], // Empty for list view
      }
    })

    return { data: teamsWithAggregates as TeamWithMembers[], error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { data: null, error: 'Not authenticated' }
    }

    return { data: null, error: (error as Error).message }
  }
}

/**
 * Get all teams (Admin only)
 */
export async function getAllTeams(): Promise<{
  data: TeamWithMembers[] | null
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Check if user is system admin
    const isAdmin = await isSystemAdmin(user.id, supabase)

    if (!isAdmin) {
      return { data: null, error: 'Not authorized - admin access required' }
    }

    // Fetch all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .is('archived_at', null)
      .order('name', { ascending: true })

    if (teamsError) {
      return { data: null, error: teamsError.message }
    }

    if (!teams || teams.length === 0) {
      return { data: [], error: null }
    }

    const teamIds = teams.map((team) => team.id)

    // Fetch member counts and scorecard counts WITHOUT profile joins for speed
    const [memberCountsResult, scorecardRowsResult] = await Promise.all([
      supabase
        .from('team_members')
        .select('team_id')
        .in('team_id', teamIds),
      supabase
        .from('scorecards')
        .select('id, team_id')
        .in('team_id', teamIds)
        .eq('is_active', true),
    ])

    if (memberCountsResult.error) {
      console.error('Error fetching team member counts', memberCountsResult.error)
    }

    if (scorecardRowsResult.error) {
      console.error('Error fetching team scorecards', scorecardRowsResult.error)
    }

    // Count members by team (no profile data needed for list view)
    const memberCountByTeam = new Map<string, number>()
    memberCountsResult.data?.forEach((row) => {
      memberCountByTeam.set(row.team_id, (memberCountByTeam.get(row.team_id) || 0) + 1)
    })

    // Count scorecards by team
    const scorecardCountByTeam = new Map<string, number>()
    scorecardRowsResult.data?.forEach((row) => {
      if (!row.team_id) {
        return
      }

      scorecardCountByTeam.set(row.team_id, (scorecardCountByTeam.get(row.team_id) || 0) + 1)
    })

    // Add member and scorecard counts to teams
    const teamsWithAggregates = teams.map((team) => {
      return {
        ...team,
        members: [], // Empty for list view - profiles loaded on demand
        member_count: memberCountByTeam.get(team.id) || 0,
        scorecard_count: scorecardCountByTeam.get(team.id) || 0,
        scorecards: [], // Empty for list view
      }
    })

    return { data: teamsWithAggregates as TeamWithMembers[], error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { data: null, error: 'Not authenticated' }
    }

    return { data: null, error: (error as Error).message }
  }
}

/**
 * Get team details by ID
 */
export async function getTeamDetails(teamId: string): Promise<{
  data: TeamWithMembers | null
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Check if user has permission to view team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    const isAdmin = await isSystemAdmin(user.id, supabase)

    if (!membership && !isAdmin) {
      return { data: null, error: 'Not authorized to view this team' }
    }

    // Fetch team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError) {
      return { data: null, error: teamError.message }
    }

    // Fetch members with profiles and full scorecard data
    const [membersResult, scorecardsResult] = await Promise.all([
      supabase
        .from('team_members')
        .select('*, profile:profiles(*)')
        .eq('team_id', teamId)
        .order('created_at'),
      supabase
        .from('scorecards')
        .select('*')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
    ])

    if (membersResult.error) {
      console.error('Error fetching team members', membersResult.error)
    }

    if (scorecardsResult.error) {
      console.error('Error fetching team scorecards', scorecardsResult.error)
    }

    return {
      data: {
        ...team,
        members: membersResult.data || [],
        member_count: membersResult.data?.length ?? 0,
        scorecard_count: scorecardsResult.data?.length ?? 0,
        scorecards: scorecardsResult.data || [],
      } as TeamWithMembers,
      error: null,
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return { data: null, error: 'Not authenticated' }
    }

    return { data: null, error: (error as Error).message }
  }
}

/**
 * Create a new team
 * For admins: can specify owner and members
 * For regular users: automatically become owner
 */
export async function createTeam(data: {
  name: string
  description?: string
  ownerId?: string
  memberIds?: string[]
}): Promise<{
  data: Team | null
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Check if user is admin
    const isAdmin = await isSystemAdmin(user.id, supabase)

    // Determine the owner
    const ownerId = data.ownerId || user.id

    // If non-admin tries to set a different owner, reject
    if (!isAdmin && data.ownerId && data.ownerId !== user.id) {
      return { data: null, error: 'Only system administrators can create teams for others' }
    }

    // Verify owner exists and is active
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('id, is_active')
      .eq('id', ownerId)
      .single()

    if (ownerError || !ownerProfile) {
      return { data: null, error: 'Selected owner not found' }
    }

    if (!ownerProfile.is_active) {
      return { data: null, error: 'Selected owner account is inactive' }
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: data.name,
        description: data.description || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (teamError) {
      return { data: null, error: teamError.message }
    }

    // Prepare members to add
    const membersToAdd: {
      team_id: string
      user_id: string
      role: (typeof TEAM_ROLES)[keyof typeof TEAM_ROLES]
    }[] = []

    // Add owner
    membersToAdd.push({
      team_id: team.id,
      user_id: ownerId,
      role: TEAM_ROLES.OWNER,
    })

    // Add additional members if specified
    if (data.memberIds && data.memberIds.length > 0) {
      // Filter out owner from members list to avoid duplicates
      const uniqueMemberIds = data.memberIds.filter(id => id !== ownerId)

      for (const memberId of uniqueMemberIds) {
        membersToAdd.push({
          team_id: team.id,
          user_id: memberId,
          role: TEAM_ROLES.MEMBER,
        })
      }
    }

    // Insert all members
    const { error: memberError } = await supabase
      .from('team_members')
      .insert(membersToAdd)

    if (memberError) {
      // Rollback: delete team if member creation fails
      await supabase.from('teams').delete().eq('id', team.id)
      return { data: null, error: memberError.message }
    }

    revalidatePath('/teams')
    return { data: team, error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { data: null, error: 'Not authenticated' }
    }

    return { data: null, error: (error as Error).message }
  }
}

/**
 * Update team details
 * Requires owner role
 */
export async function updateTeam(
  teamId: string,
  data: {
    name?: string
    description?: string | null
  }
): Promise<{
  data: Team | null
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Check permission
    await requireTeamPermission(teamId, user.id, TEAM_ROLES.OWNER, supabase)

    // Update team
    const { data: team, error } = await supabase
      .from('teams')
      .update(data)
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    revalidatePath('/teams')
    revalidatePath(`/teams/${teamId}`)
    return { data: team, error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { data: null, error: 'Not authenticated' }
    }

    return { data: null, error: (error as Error).message }
  }
}

/**
 * Archive (soft delete) a team
 * Requires owner role
 */
export async function archiveTeam(teamId: string): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Check if user can delete team
    const canDelete = await canDeleteTeam(teamId, user.id, supabase)

    if (!canDelete) {
      return { success: false, error: 'Only team owners can archive teams' }
    }

    // Archive team (soft delete)
    const { error } = await supabase
      .from('teams')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', teamId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/teams')
    return { success: true, error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    return { success: false, error: (error as Error).message }
  }
}

/**
 * Permanently delete a team
 * Requires owner role
 * WARNING: This cannot be undone
 */
export async function deleteTeam(teamId: string): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Check if user can delete team
    const canDelete = await canDeleteTeam(teamId, user.id, supabase)

    if (!canDelete) {
      return { success: false, error: 'Only team owners can delete teams' }
    }

    // Check if team has active scorecards
    const { data: scorecards } = await supabase
      .from('scorecards')
      .select('id')
      .eq('team_id', teamId)
      .eq('is_active', true)

    if (scorecards && scorecards.length > 0) {
      return {
        success: false,
        error: `Cannot delete team with ${scorecards.length} active scorecard(s). Archive or delete scorecards first.`,
      }
    }

    // Delete team members first (foreign key constraint)
    await supabase.from('team_members').delete().eq('team_id', teamId)

    // Delete team
    const { error } = await supabase.from('teams').delete().eq('id', teamId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/teams')
    return { success: true, error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    return { success: false, error: (error as Error).message }
  }
}
