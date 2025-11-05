'use server'

/**
 * Team Server Actions
 * CRUD operations for teams with permission checks
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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

interface TeamWithMembers extends Team {
  members: (TeamMember & { profile: Profile })[]
  member_count: number
  scorecard_count: number
}

/**
 * Get all teams for the current user
 */
export async function getUserTeams(): Promise<{
  data: TeamWithMembers[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Get teams where user is a member
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)

    if (membersError) {
      return { data: null, error: membersError.message }
    }

    const teamIds = teamMembers.map((m) => m.team_id)

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

    // Fetch member counts and scorecard counts for each team
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const [memberCountResult, scorecardCountResult, membersResult] = await Promise.all([
          supabase
            .from('team_members')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', team.id),
          supabase
            .from('scorecards')
            .select('id', { count: 'exact', head: true })
            .eq('team_id', team.id)
            .eq('is_active', true),
          supabase
            .from('team_members')
            .select('*, profile:profiles(*)')
            .eq('team_id', team.id)
            .order('created_at'),
        ])

        return {
          ...team,
          members: membersResult.data || [],
          member_count: memberCountResult.count || 0,
          scorecard_count: scorecardCountResult.count || 0,
        }
      })
    )

    return { data: teamsWithCounts as TeamWithMembers[], error: null }
  } catch (error) {
    return { data: null, error: (error as Error).message }
  }
}

/**
 * Get all teams (Admin only)
 */
export async function getAllTeams(): Promise<{
  data: Team[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Check if user is system admin
    const isAdmin = await isSystemAdmin(user.id)

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

    return { data: teams, error: null }
  } catch (error) {
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
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Check if user has permission to view team
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    const isAdmin = await isSystemAdmin(user.id)

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

    // Fetch members with profiles
    const { data: members } = await supabase
      .from('team_members')
      .select('*, profile:profiles(*)')
      .eq('team_id', teamId)
      .order('created_at')

    // Get counts
    const [memberCountResult, scorecardCountResult] = await Promise.all([
      supabase
        .from('team_members')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamId),
      supabase
        .from('scorecards')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('is_active', true),
    ])

    return {
      data: {
        ...team,
        members: members || [],
        member_count: memberCountResult.count || 0,
        scorecard_count: scorecardCountResult.count || 0,
      } as TeamWithMembers,
      error: null,
    }
  } catch (error) {
    return { data: null, error: (error as Error).message }
  }
}

/**
 * Create a new team
 */
export async function createTeam(data: {
  name: string
  description?: string
}): Promise<{
  data: Team | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
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

    // Add creator as team owner
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: TEAM_ROLES.OWNER,
      })

    if (memberError) {
      // Rollback: delete team if member creation fails
      await supabase.from('teams').delete().eq('id', team.id)
      return { data: null, error: memberError.message }
    }

    revalidatePath('/teams')
    return { data: team, error: null }
  } catch (error) {
    return { data: null, error: (error as Error).message }
  }
}

/**
 * Update team details
 * Requires admin or owner role
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
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Check permission
    await requireTeamPermission(teamId, user.id, TEAM_ROLES.ADMIN)

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
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if user can delete team
    const canDelete = await canDeleteTeam(teamId, user.id)

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
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if user can delete team
    const canDelete = await canDeleteTeam(teamId, user.id)

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
    return { success: false, error: (error as Error).message }
  }
}
