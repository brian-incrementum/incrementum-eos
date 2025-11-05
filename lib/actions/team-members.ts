'use server'

/**
 * Team Members Server Actions
 * Member management operations with permission checks
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Tables } from '@/lib/types/database.types'
import { canManageTeamMembers } from '@/lib/auth/permissions'
import { TEAM_ROLES, type TeamRole } from '@/lib/auth/constants'

type TeamMember = Tables<'team_members'>
type Profile = Tables<'profiles'>

interface TeamMemberWithProfile extends TeamMember {
  profile: Profile
}

/**
 * Get all members of a team
 */
export async function getTeamMembers(teamId: string): Promise<{
  data: TeamMemberWithProfile[] | null
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

    // Fetch team members with profiles
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('team_id', teamId)
      .order('created_at')

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as TeamMemberWithProfile[], error: null }
  } catch (error) {
    return { data: null, error: (error as Error).message }
  }
}

/**
 * Add a member to a team
 * Requires admin or owner role
 */
export async function addTeamMember(
  teamId: string,
  userId: string,
  role: TeamRole = TEAM_ROLES.MEMBER
): Promise<{
  data: TeamMember | null
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

    // Check if current user can manage members
    const canManage = await canManageTeamMembers(teamId, user.id)

    if (!canManage) {
      return {
        data: null,
        error: 'Only team owners and admins can add members',
      }
    }

    // Verify the user to be added exists and is active
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, is_active')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return { data: null, error: 'User not found' }
    }

    if (!profile.is_active) {
      return { data: null, error: 'User account is inactive' }
    }

    // Check if user is already a member
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      return { data: null, error: 'User is already a team member' }
    }

    // Add member
    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    revalidatePath(`/teams/${teamId}`)
    return { data, error: null }
  } catch (error) {
    return { data: null, error: (error as Error).message }
  }
}

/**
 * Update a team member's role
 * Requires admin or owner role
 * Admins cannot change owner roles
 */
export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  newRole: TeamRole
): Promise<{
  data: TeamMember | null
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

    // Check if current user can manage members
    const canManage = await canManageTeamMembers(teamId, user.id)

    if (!canManage) {
      return {
        data: null,
        error: 'Only team owners and admins can update member roles',
      }
    }

    // Get current member's role
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (!member) {
      return { data: null, error: 'Team member not found' }
    }

    // Cannot change owner role
    if (member.role === TEAM_ROLES.OWNER) {
      return {
        data: null,
        error: 'Cannot change the role of a team owner',
      }
    }

    // Get current user's role
    const { data: currentUser } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    // Only owners can promote to admin
    if (newRole === TEAM_ROLES.ADMIN && currentUser?.role !== TEAM_ROLES.OWNER) {
      return {
        data: null,
        error: 'Only team owners can promote members to admin',
      }
    }

    // Update role
    const { data, error } = await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    revalidatePath(`/teams/${teamId}`)
    return { data, error: null }
  } catch (error) {
    return { data: null, error: (error as Error).message }
  }
}

/**
 * Remove a member from a team
 * Requires admin or owner role
 * Cannot remove owners
 */
export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<{
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

    // Check if current user can manage members
    const canManage = await canManageTeamMembers(teamId, user.id)

    if (!canManage) {
      return {
        success: false,
        error: 'Only team owners and admins can remove members',
      }
    }

    // Get member's role
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (!member) {
      return { success: false, error: 'Team member not found' }
    }

    // Cannot remove owners
    if (member.role === TEAM_ROLES.OWNER) {
      return {
        success: false,
        error: 'Cannot remove team owner. Transfer ownership first.',
      }
    }

    // Remove member
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(`/teams/${teamId}`)
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Transfer team ownership to another member
 * Current owner becomes admin
 * Only current owner can transfer ownership
 */
export async function transferTeamOwnership(
  teamId: string,
  newOwnerId: string
): Promise<{
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

    // Verify current user is the owner
    const { data: currentMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (currentMember?.role !== TEAM_ROLES.OWNER) {
      return {
        success: false,
        error: 'Only the current owner can transfer ownership',
      }
    }

    // Verify new owner is a member
    const { data: newMember } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', newOwnerId)
      .single()

    if (!newMember) {
      return {
        success: false,
        error: 'New owner must be a team member',
      }
    }

    // Update both members in a transaction-like manner
    // Demote current owner to admin
    const { error: demoteError } = await supabase
      .from('team_members')
      .update({ role: TEAM_ROLES.ADMIN })
      .eq('team_id', teamId)
      .eq('user_id', user.id)

    if (demoteError) {
      return { success: false, error: demoteError.message }
    }

    // Promote new owner
    const { error: promoteError } = await supabase
      .from('team_members')
      .update({ role: TEAM_ROLES.OWNER })
      .eq('team_id', teamId)
      .eq('user_id', newOwnerId)

    if (promoteError) {
      // Rollback: restore original owner
      await supabase
        .from('team_members')
        .update({ role: TEAM_ROLES.OWNER })
        .eq('team_id', teamId)
        .eq('user_id', user.id)

      return { success: false, error: promoteError.message }
    }

    revalidatePath(`/teams/${teamId}`)
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Leave a team
 * Members can leave anytime
 * Owners cannot leave (must transfer ownership first)
 */
export async function leaveTeam(teamId: string): Promise<{
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

    // Get member's role
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return { success: false, error: 'You are not a member of this team' }
    }

    // Owners cannot leave
    if (member.role === TEAM_ROLES.OWNER) {
      return {
        success: false,
        error: 'Team owners cannot leave. Transfer ownership first.',
      }
    }

    // Remove member
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/teams')
    revalidatePath(`/teams/${teamId}`)
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
