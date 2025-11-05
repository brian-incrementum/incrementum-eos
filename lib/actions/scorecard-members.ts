'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Tables } from '@/lib/types/database.types'

type Profile = Tables<'profiles'>
type ScorecardMember = Tables<'scorecard_members'>

export interface MemberWithProfile extends ScorecardMember {
  profile: Profile
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
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { members: null, error: 'Not authenticated' }
    }

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
      const members: MemberWithProfile[] = (teamMembers || []).map((tm: any) => ({
        id: tm.id,
        scorecard_id: scorecardId, // Use scorecardId for consistency
        user_id: tm.user_id,
        role: tm.role === 'owner' ? 'owner' : tm.role === 'admin' ? 'editor' : 'viewer', // Map team roles to scorecard roles
        created_at: tm.created_at,
        profile: tm.profile
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
    console.error('Unexpected error in getScorecardMembers:', error)
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
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { count: 0, error: 'Not authenticated' }
    }

    // Count metrics owned by this user in this scorecard
    const { data, error: countError } = await supabase
      .from('metrics')
      .select('id', { count: 'exact', head: true })
      .eq('scorecard_id', scorecardId)
      .eq('owner_user_id', userId)
      .eq('is_active', true)

    if (countError) {
      console.error('Error counting metrics:', countError)
      return { count: 0, error: 'Failed to count metrics' }
    }

    return { count: data?.length || 0, error: null }
  } catch (error) {
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
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if this is a team scorecard
    const { data: scorecard } = await supabase
      .from('scorecards')
      .select('type, team_id')
      .eq('id', scorecardId)
      .single()

    if (scorecard?.type === 'team' && scorecard.team_id) {
      return {
        success: false,
        error: 'Cannot manually add members to team scorecards. Members are automatically synced from the team.'
      }
    }

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
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if this is a team scorecard
    const { data: scorecard } = await supabase
      .from('scorecards')
      .select('type, team_id')
      .eq('id', scorecardId)
      .single()

    if (scorecard?.type === 'team' && scorecard.team_id) {
      return {
        success: false,
        error: 'Cannot manually remove members from team scorecards. Members are automatically synced from the team.'
      }
    }

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
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check if this is a team scorecard
    const { data: scorecard } = await supabase
      .from('scorecards')
      .select('type, team_id')
      .eq('id', scorecardId)
      .single()

    if (scorecard?.type === 'team' && scorecard.team_id) {
      return {
        success: false,
        error: 'Cannot change member roles in team scorecards. Roles are automatically synced from the team.'
      }
    }

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
    console.error('Unexpected error in updateMemberRole:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
