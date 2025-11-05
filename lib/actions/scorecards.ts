'use server'

import { revalidatePath } from 'next/cache'

import { AuthError, requireUser } from '@/lib/auth/session'
import { loadScorecardListings } from '@/lib/loaders/scorecard-listings'
import type { ScorecardTable, ScorecardWithDetails } from '@/lib/types/scorecards'
import { canCreateRoleScorecardFor, isSystemAdmin } from '@/lib/auth/permissions'

type Scorecard = ScorecardTable

/**
 * Get organized scorecards with enhanced details
 * Returns two categories: your scorecards and company scorecards
 */
export async function getOrganizedScorecards(): Promise<{
  yourScorecards: ScorecardWithDetails[]
  companyScorecards: ScorecardWithDetails[]
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    return await loadScorecardListings({ supabase, userId: user.id })
  } catch (error) {
    if (error instanceof AuthError) {
      return { yourScorecards: [], companyScorecards: [], error: 'Not authenticated' }
    }

    console.error('Unexpected error in getOrganizedScorecards:', error)
    return { yourScorecards: [], companyScorecards: [], error: 'An unexpected error occurred' }
  }
}

/**
 * Get all scorecards where the user is either the owner or a member
 */
export async function getUserScorecards(): Promise<{
  data: Scorecard[] | null
  error: string | null
}> {
  try {
    const { supabase, user } = await requireUser()

    // Fetch scorecards where user is owner
    const { data: ownedScorecards, error: ownedError } = await supabase
      .from('scorecards')
      .select('*')
      .eq('is_active', true)
      .eq('owner_user_id', user.id)

    if (ownedError) {
      console.error('Error fetching owned scorecards:', ownedError)
      return { data: null, error: ownedError.message }
    }

    // Get scorecards where user is a member (via scorecard_members)
    const { data: memberScorecards, error: memberError } = await supabase
      .from('scorecard_members')
      .select('scorecards(*)')
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error fetching member scorecards:', memberError)
      return { data: null, error: memberError.message }
    }

    // Combine and deduplicate scorecards
    const allScorecards = new Map<string, Scorecard>()

    // Add owned scorecards
    ownedScorecards?.forEach((scorecard) => {
      allScorecards.set(scorecard.id, scorecard)
    })

    // Add member scorecards (filter for active ones)
    memberScorecards?.forEach((member) => {
      if (member.scorecards && member.scorecards.is_active) {
        allScorecards.set(member.scorecards.id, member.scorecards as Scorecard)
      }
    })

    // Convert to array and sort by creation date
    const uniqueScorecards = Array.from(allScorecards.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return { data: uniqueScorecards, error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { data: null, error: 'Not authenticated' }
    }

    console.error('Unexpected error in getUserScorecards:', error)
    return { data: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Create a new scorecard
 * - Team scorecards: System admins only
 * - Role scorecards: System admins, the user themselves, or their manager
 */
export async function createScorecard(formData: FormData): Promise<{
  success: boolean
  error?: string
  scorecardId?: string
}> {
  try {
    const { supabase, user } = await requireUser()

    // Validate input
    const type = formData.get('type') as 'team' | 'role'
    const teamId = formData.get('team_id') as string | null
    const roleId = formData.get('role_id') as string | null
    const ownerUserId = formData.get('owner_user_id') as string

    if (!type || !['team', 'role'].includes(type)) {
      return { success: false, error: 'Scorecard type must be either "team" or "role"' }
    }

    if (!ownerUserId) {
      return { success: false, error: 'Owner user ID is required' }
    }

    // Check permissions based on scorecard type
    const isAdmin = await isSystemAdmin(user.id, supabase)

    if (type === 'team') {
      // Only system admins can create team scorecards
      if (!isAdmin) {
        return {
          success: false,
          error: 'Only system administrators can create team scorecards',
        }
      }
    } else if (type === 'role') {
      // For role scorecards: must be admin, the user themselves, or their manager
      const canCreate = await canCreateRoleScorecardFor(ownerUserId, user.id, supabase)
      if (!canCreate) {
        return {
          success: false,
          error: 'You can only create role scorecards for yourself or your direct reports',
        }
      }
    }

    // Validate team scorecard
    if (type === 'team') {
      if (!teamId) {
        return { success: false, error: 'Team ID is required for team scorecards' }
      }

      // Check if team already has a scorecard
      const { data: existingScorecard } = await supabase
        .from('scorecards')
        .select('id')
        .eq('type', 'team')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .single()

      if (existingScorecard) {
        return { success: false, error: 'This team already has a scorecard' }
      }
    }

    // Validate role scorecard
    if (type === 'role') {
      if (!roleId) {
        return { success: false, error: 'Role ID is required for role scorecards' }
      }

      // Check if this employee already has a scorecard for this role
      const { data: existingScorecard } = await supabase
        .from('scorecards')
        .select('id')
        .eq('type', 'role')
        .eq('role_id', roleId)
        .eq('owner_user_id', ownerUserId)
        .eq('is_active', true)
        .single()

      if (existingScorecard) {
        return { success: false, error: 'This employee already has a scorecard for this role' }
      }

      // Verify employee is assigned to this role
      const { data: employeeRole } = await supabase
        .from('employee_roles')
        .select('id')
        .eq('profile_id', ownerUserId)
        .eq('role_id', roleId)
        .single()

      if (!employeeRole) {
        return {
          success: false,
          error: 'Employee must be assigned to the role before creating a role scorecard',
        }
      }
    }

    // Insert scorecard (name will be auto-generated by trigger)
    const { data: scorecard, error: scorecardError } = await supabase
      .from('scorecards')
      .insert({
        type,
        owner_user_id: ownerUserId,
        created_by: user.id,
        team_id: type === 'team' ? teamId : null,
        role_id: type === 'role' ? roleId : null,
      })
      .select()
      .single()

    if (scorecardError || !scorecard) {
      console.error('Error creating scorecard:', scorecardError)
      return { success: false, error: scorecardError?.message || 'Failed to create scorecard' }
    }

    // Insert scorecard member (owner)
    const { error: memberError } = await supabase.from('scorecard_members').insert({
      scorecard_id: scorecard.id,
      user_id: ownerUserId,
      role: 'owner',
    })

    if (memberError) {
      console.error('Error adding scorecard member:', memberError)
      // Note: Scorecard was created but member wasn't added
      // In production, you might want to delete the scorecard or handle this differently
    }

    // Revalidate the scorecards page
    revalidatePath('/scorecards')

    return { success: true, scorecardId: scorecard.id }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Unexpected error in createScorecard:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Update scorecard active status (Admin only)
 * Note: Names and types are auto-generated and cannot be manually updated
 */
export async function updateScorecard(
  scorecardId: string,
  isActive: boolean
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { supabase, user } = await requireUser()

    // Check if user is system admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_system_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_system_admin) {
      return {
        success: false,
        error: 'Only system administrators can update scorecards',
      }
    }

    // Verify scorecard exists
    const { data: scorecard } = await supabase
      .from('scorecards')
      .select('id')
      .eq('id', scorecardId)
      .single()

    if (!scorecard) {
      return { success: false, error: 'Scorecard not found' }
    }

    // Update scorecard active status
    const { error: updateError } = await supabase
      .from('scorecards')
      .update({ is_active: isActive })
      .eq('id', scorecardId)

    if (updateError) {
      console.error('Error updating scorecard:', updateError)
      return { success: false, error: 'Failed to update scorecard' }
    }

    // Revalidate the scorecard pages
    revalidatePath('/scorecards')
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Unexpected error in updateScorecard:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
