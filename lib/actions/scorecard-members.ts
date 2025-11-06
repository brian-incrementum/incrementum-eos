'use server'

import { revalidatePath } from 'next/cache'

import { AuthError, requireUser } from '@/lib/auth/session'
import type { Tables } from '@/lib/types/database.types'

type Profile = Tables<'profiles'>
type ScorecardMember = Tables<'scorecard_members'>
type TeamMember = Tables<'team_members'>

export interface MemberWithProfile extends ScorecardMember {
  profile: Profile
}

type TeamMemberWithProfile = TeamMember & { profile: Profile | null }

const mapTeamRoleToScorecardRole = (role: TeamMember['role']): MemberWithProfile['role'] => {
  if (role === 'owner') {
    return 'owner'
  }

  return 'viewer'
}

/**
 * Get all members of a scorecard with their profile details
 * For TEAM scorecards, fetches members from the team_members table
 * For other scorecards, fetches from scorecard_members table
 */
export async function getScorecardMembers(scorecardId: string): Promise<{
  members: MemberWithProfile[] | null
  error: string | null
}> {
  try {
    const { supabase } = await requireUser()

    // First, fetch the scorecard to check its type and team_id
    const { data: scorecard, error: scorecardError } = await supabase
      .from('scorecards')
      .select('type, team_id')
      .eq('id', scorecardId)
      .single()

    if (scorecardError) {
      console.error('Error fetching scorecard:', scorecardError)
      return { members: null, error: 'Failed to fetch scorecard' }
    }

    // If it's a TEAM scorecard with a team_id, fetch team members
    if (scorecard.type === 'team' && scorecard.team_id) {
      const { data: teamMembers, error: teamMembersError } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profile:profiles(*)
        `)
        .eq('team_id', scorecard.team_id)
        .order('created_at', { ascending: true })

      if (teamMembersError) {
        console.error('Error fetching team members:', teamMembersError)
        return { members: null, error: 'Failed to fetch team members' }
      }

      // Map team members to MemberWithProfile format
      const members: MemberWithProfile[] = (teamMembers || [])
        .map((teamMember) => teamMember as TeamMemberWithProfile)
        .filter((teamMember): teamMember is TeamMemberWithProfile => Boolean(teamMember.profile))
        .map((teamMember) => ({
          id: teamMember.id,
          scorecard_id: scorecardId, // Use scorecardId for consistency
          user_id: teamMember.user_id,
          role: mapTeamRoleToScorecardRole(teamMember.role), // Map team roles to scorecard roles
          created_at: teamMember.created_at,
          profile: teamMember.profile as Profile,
        }))

      return { members, error: null }
    }

    // For non-team scorecards, fetch from scorecard_members
    const { data: members, error: membersError } = await supabase
      .from('scorecard_members')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('scorecard_id', scorecardId)
      .order('created_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching scorecard members:', membersError)
      return { members: null, error: 'Failed to fetch members' }
    }

    return { members: members as MemberWithProfile[], error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { members: null, error: 'Not authenticated' }
    }

    console.error('Unexpected error in getScorecardMembers:', error)
    return { members: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Get additional members who have been manually shared access to the scorecard
 * This fetches from scorecard_members table regardless of scorecard type
 * Used to show "Shared With" section separately from auto-synced team members
 */
export async function getAdditionalScorecardMembers(scorecardId: string): Promise<{
  members: MemberWithProfile[] | null
  error: string | null
}> {
  try {
    const { supabase } = await requireUser()

    // Always fetch from scorecard_members table
    const { data: members, error: membersError } = await supabase
      .from('scorecard_members')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('scorecard_id', scorecardId)
      .order('created_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching additional scorecard members:', membersError)
      return { members: null, error: 'Failed to fetch shared members' }
    }

    return { members: members as MemberWithProfile[], error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { members: null, error: 'Not authenticated' }
    }

    console.error('Unexpected error in getAdditionalScorecardMembers:', error)
    return { members: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Get count of metrics owned by a user in a scorecard
 */
export async function getMemberMetricCount(
  scorecardId: string,
  userId: string
): Promise<{
  count: number
  error: string | null
}> {
  try {
    const { supabase } = await requireUser()

    // Count metrics owned by this user in this scorecard
    const { count, error: countError } = await supabase
      .from('metrics')
      .select('id', { count: 'exact', head: true })
      .eq('scorecard_id', scorecardId)
      .eq('owner_user_id', userId)
      .eq('is_active', true)

    if (countError) {
      console.error('Error counting metrics:', countError)
      return { count: 0, error: 'Failed to count metrics' }
    }

    return { count: count ?? 0, error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { count: 0, error: 'Not authenticated' }
    }

    console.error('Unexpected error in getMemberMetricCount:', error)
    return { count: 0, error: 'An unexpected error occurred' }
  }
}

/**
 * Add a new member to a scorecard
 * Note: Team scorecards automatically sync members from their team
 */
export async function addScorecardMember(
  scorecardId: string,
  userId: string,
  role: 'owner' | 'editor' | 'viewer'
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { supabase } = await requireUser()

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('scorecard_members')
      .select('id')
      .eq('scorecard_id', scorecardId)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      return { success: false, error: 'User is already a member' }
    }

    // Add member
    const { error: insertError } = await supabase
      .from('scorecard_members')
      .insert({
        scorecard_id: scorecardId,
        user_id: userId,
        role,
      })

    if (insertError) {
      console.error('Error adding scorecard member:', insertError)
      return { success: false, error: 'Failed to add member' }
    }

    revalidatePath(`/scorecards/${scorecardId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Unexpected error in addScorecardMember:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Remove a member from a scorecard
 * Validates that the member doesn't own any metrics
 * Note: Team scorecards automatically sync members from their team
 */
export async function removeScorecardMember(
  scorecardId: string,
  memberId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { supabase } = await requireUser()

    // Get the member to find user_id
    const { data: member } = await supabase
      .from('scorecard_members')
      .select('user_id, role')
      .eq('id', memberId)
      .single()

    if (!member) {
      return { success: false, error: 'Member not found' }
    }

    // Don't allow removing owners
    if (member.role === 'owner') {
      return { success: false, error: 'Cannot remove the scorecard owner' }
    }

    // Check if member owns any metrics
    const { count } = await getMemberMetricCount(scorecardId, member.user_id)

    if (count > 0) {
      return {
        success: false,
        error: `Cannot remove member who owns ${count} metric${count > 1 ? 's' : ''}`
      }
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from('scorecard_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.error('Error removing scorecard member:', deleteError)
      return { success: false, error: 'Failed to remove member' }
    }

    revalidatePath(`/scorecards/${scorecardId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Unexpected error in removeScorecardMember:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Update a member's role
 * Note: Team scorecards automatically sync members from their team
 */
export async function updateMemberRole(
  scorecardId: string,
  memberId: string,
  newRole: 'owner' | 'editor' | 'viewer'
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { supabase } = await requireUser()

    // Update role
    const { error: updateError } = await supabase
      .from('scorecard_members')
      .update({ role: newRole })
      .eq('id', memberId)
      .eq('scorecard_id', scorecardId)

    if (updateError) {
      console.error('Error updating member role:', updateError)
      return { success: false, error: 'Failed to update role' }
    }

    revalidatePath(`/scorecards/${scorecardId}`)
    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Unexpected error in updateMemberRole:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
