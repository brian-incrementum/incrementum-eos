'use server'

/**
 * Team Members Server Actions
 * Member management operations with permission checks
 */

import { revalidatePath } from 'next/cache'

import { AuthError, requireUser } from '@/lib/auth/session'
import type { Tables } from '@/lib/types/database.types'
import { canManageTeamMembers, isSystemAdmin } from '@/lib/auth/permissions'
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
    const { supabase } = await requireUser()

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
    if (error instanceof AuthError) {
      return { data: null, error: 'Not authenticated' }
    }

    return { data: null, error: (error as Error).message }
  }
}

/**
 * Add a member to a team
 * Requires owner role
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
    const { supabase, user } = await requireUser()

    // Check if current user can manage members
    const canManage = await canManageTeamMembers(teamId, user.id, supabase)

    if (!canManage) {
      return {
        data: null,
        error: 'Only team owners can add members',
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
    if (error instanceof AuthError) {
      return { data: null, error: 'Not authenticated' }
    }

    return { data: null, error: (error as Error).message }
  }
}

/**
 * Update a team member's role
 * Requires owner role
 * Cannot change owner roles
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
    const { supabase, user } = await requireUser()

    // Check if current user can manage members
    const canManage = await canManageTeamMembers(teamId, user.id, supabase)

    if (!canManage) {
      return {
        data: null,
        error: 'Only team owners can update member roles',
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
    if (error instanceof AuthError) {
      return { data: null, error: 'Not authenticated' }
    }

    return { data: null, error: (error as Error).message }
  }
}

/**
 * Remove a member from a team
 * Requires owner role or admin
 * Only admins can remove owners
 */
export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Check if current user is admin or can manage members
    const isAdmin = await isSystemAdmin(user.id, supabase)
    const canManage = await canManageTeamMembers(teamId, user.id, supabase)

    if (!isAdmin && !canManage) {
      return {
        success: false,
        error: 'Only team owners or admins can remove members',
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

    // Only admins can remove owners
    if (member.role === TEAM_ROLES.OWNER && !isAdmin) {
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
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    return { success: false, error: (error as Error).message }
  }
}

/**
 * Transfer team ownership to another member
 * Current owner becomes a regular member
 * Only system administrators can transfer ownership
 */
export async function transferTeamOwnership(
  teamId: string,
  newOwnerId: string
): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Verify current user is a system admin
    const isAdmin = await isSystemAdmin(user.id, supabase)

    if (!isAdmin) {
      return {
        success: false,
        error: 'Only system administrators can transfer ownership',
      }
    }

    // Get the current owner
    const { data: currentOwner } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('role', TEAM_ROLES.OWNER)
      .single()

    if (!currentOwner) {
      return {
        success: false,
        error: 'Team has no current owner',
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
    // Demote current owner to member
    const { error: demoteError } = await supabase
      .from('team_members')
      .update({ role: TEAM_ROLES.MEMBER })
      .eq('team_id', teamId)
      .eq('user_id', currentOwner.user_id)

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
        .eq('user_id', currentOwner.user_id)

      return { success: false, error: promoteError.message }
    }

    revalidatePath(`/teams/${teamId}`)
    return { success: true, error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    return { success: false, error: (error as Error).message }
  }
}

/**
 * Leave a team
 * Members can leave anytime
 * Owners cannot leave (must transfer ownership first)
 * System admins who are owners can leave if there are other members to transfer to
 */
export async function leaveTeam(teamId: string): Promise<{
  success: boolean
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Check if user is system admin
    const isAdmin = await isSystemAdmin(user.id, supabase)

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

    // Handle owner leaving
    if (member.role === TEAM_ROLES.OWNER) {
      // If admin, allow them to leave by automatically transferring ownership
      if (isAdmin) {
        // Find another member to transfer ownership to
        const { data: otherMembers } = await supabase
          .from('team_members')
          .select('user_id, created_at')
          .eq('team_id', teamId)
          .neq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)

        if (!otherMembers || otherMembers.length === 0) {
          return {
            success: false,
            error:
              'Cannot leave as the only team member. Please add another member first or delete the team.',
          }
        }

        // Automatically transfer ownership to the most senior other member
        const newOwnerId = otherMembers[0].user_id

        // Demote current owner to member
        const { error: demoteError } = await supabase
          .from('team_members')
          .update({ role: TEAM_ROLES.MEMBER })
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

        // Now remove the admin as a member
        const { error: removeError } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', teamId)
          .eq('user_id', user.id)

        if (removeError) {
          return { success: false, error: removeError.message }
        }

        revalidatePath('/teams')
        revalidatePath(`/teams/${teamId}`)
        return { success: true, error: null }
      }

      // Non-admins must transfer ownership manually first
      return {
        success: false,
        error: 'Team owners cannot leave. Transfer ownership first.',
      }
    }

    // Regular members can leave anytime
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
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    return { success: false, error: (error as Error).message }
  }
}
