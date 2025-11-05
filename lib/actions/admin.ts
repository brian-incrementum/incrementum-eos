'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Tables } from '@/lib/types/database.types'
import { isSystemAdmin } from '@/lib/auth/permissions'

type Profile = Tables<'profiles'>
type Employee = Tables<'employees'>

export interface UserWithProfile {
  id: string
  email: string
  profile: Profile | null
  employee: Employee | null
  team_count: number
  scorecard_count: number
  created_at: string
}

export interface SystemStats {
  total_users: number
  active_users: number
  total_teams: number
  total_scorecards: number
  active_scorecards: number
}

/**
 * Check if the current user is a system admin
 * This is used for authorization checks in admin routes
 */
export async function requireSystemAdmin(): Promise<void> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const isAdmin = await isSystemAdmin(user.id)

  if (!isAdmin) {
    throw new Error('Unauthorized: System admin access required')
  }
}

/**
 * Get all users with their profiles and statistics
 * Only accessible by system admins
 */
export async function getAllUsers(): Promise<{
  data: UserWithProfile[] | null
  error: string | null
}> {
  try {
    await requireSystemAdmin()

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get all auth users using admin client
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError || !authUsers) {
      console.error('Error fetching auth users:', authError)
      return { data: null, error: 'Failed to fetch users' }
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return { data: null, error: 'Failed to fetch user profiles' }
    }

    // Get all employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
    }

    // Get team member counts for each user
    const { data: teamMemberCounts, error: teamCountError } = await supabase
      .from('team_members')
      .select('user_id')

    if (teamCountError) {
      console.error('Error fetching team counts:', teamCountError)
    }

    // Get scorecard counts (owned + member)
    const { data: ownedScorecards, error: ownedError } = await supabase
      .from('scorecards')
      .select('owner_user_id')
      .eq('is_active', true)

    if (ownedError) {
      console.error('Error fetching owned scorecards:', ownedError)
    }

    const { data: memberScorecards, error: memberError } = await supabase
      .from('scorecard_members')
      .select('user_id')

    if (memberError) {
      console.error('Error fetching member scorecards:', memberError)
    }

    // Create maps for quick lookup
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])
    // Map employees by company_email since there's no user_id column
    const employeeMap = new Map(employees?.map((e) => [e.company_email?.toLowerCase(), e]) || [])

    // Count teams per user
    const teamCountMap = new Map<string, number>()
    teamMemberCounts?.forEach((tm) => {
      const count = teamCountMap.get(tm.user_id) || 0
      teamCountMap.set(tm.user_id, count + 1)
    })

    // Count scorecards per user
    const scorecardCountMap = new Map<string, number>()
    ownedScorecards?.forEach((s) => {
      const count = scorecardCountMap.get(s.owner_user_id) || 0
      scorecardCountMap.set(s.owner_user_id, count + 1)
    })
    memberScorecards?.forEach((sm) => {
      const count = scorecardCountMap.get(sm.user_id) || 0
      scorecardCountMap.set(sm.user_id, count + 1)
    })

    // Combine all data
    const users: UserWithProfile[] = authUsers.users.map((user) => {
      const profile = profileMap.get(user.id) || null
      // Match employee by email (profile.email matches employee.company_email)
      const employee = profile?.email ? employeeMap.get(profile.email.toLowerCase()) || null : null

      return {
        id: user.id,
        email: user.email || '',
        profile,
        employee,
        team_count: teamCountMap.get(user.id) || 0,
        scorecard_count: scorecardCountMap.get(user.id) || 0,
        created_at: user.created_at,
      }
    })

    // Sort by created_at descending
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return { data: users, error: null }
  } catch (error) {
    console.error('Unexpected error in getAllUsers:', error)
    return { data: null, error: (error as Error).message }
  }
}

/**
 * Get system-wide statistics
 * Only accessible by system admins
 */
export async function getSystemStats(): Promise<{
  data: SystemStats | null
  error: string | null
}> {
  try {
    await requireSystemAdmin()

    const supabase = await createClient()

    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (usersError) {
      console.error('Error counting users:', usersError)
    }

    // Get active users (users with employees records that are active)
    const { count: activeUsers, error: activeUsersError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (activeUsersError) {
      console.error('Error counting active users:', activeUsersError)
    }

    // Get total teams (not archived)
    const { count: totalTeams, error: teamsError } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .is('archived_at', null)

    if (teamsError) {
      console.error('Error counting teams:', teamsError)
    }

    // Get total scorecards
    const { count: totalScorecards, error: scorecardsError } = await supabase
      .from('scorecards')
      .select('*', { count: 'exact', head: true })

    if (scorecardsError) {
      console.error('Error counting scorecards:', scorecardsError)
    }

    // Get active scorecards
    const { count: activeScorecards, error: activeScorecardsError } = await supabase
      .from('scorecards')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (activeScorecardsError) {
      console.error('Error counting active scorecards:', activeScorecardsError)
    }

    const stats: SystemStats = {
      total_users: totalUsers || 0,
      active_users: activeUsers || 0,
      total_teams: totalTeams || 0,
      total_scorecards: totalScorecards || 0,
      active_scorecards: activeScorecards || 0,
    }

    return { data: stats, error: null }
  } catch (error) {
    console.error('Unexpected error in getSystemStats:', error)
    return { data: null, error: (error as Error).message }
  }
}

/**
 * Update a user's system admin status
 * Only accessible by system admins
 */
export async function updateUserAdminStatus(
  userId: string,
  isAdmin: boolean
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await requireSystemAdmin()

    const supabase = await createClient()

    // Get current user to prevent them from removing their own admin access
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (currentUser?.id === userId && !isAdmin) {
      return {
        success: false,
        error: 'You cannot remove your own system admin access',
      }
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_system_admin: isAdmin })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating admin status:', updateError)
      return { success: false, error: 'Failed to update admin status' }
    }

    // Revalidate admin pages
    revalidatePath('/admin')
    revalidatePath('/admin/users')

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in updateUserAdminStatus:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Get detailed information about a specific user
 * Only accessible by system admins
 */
export async function getUserDetails(userId: string): Promise<{
  data: {
    user: UserWithProfile
    teams: Array<{ id: string; name: string; role: string }>
    scorecards: Array<{ id: string; name: string; type: string; role: string }>
  } | null
  error: string | null
}> {
  try {
    await requireSystemAdmin()

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Get user from auth using admin client
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(
      userId
    )

    if (authError || !authUser) {
      console.error('Error fetching auth user:', authError)
      return { data: null, error: 'User not found' }
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
    }

    // Get employee by matching email (employees.company_email = profiles.email)
    let employee = null
    if (profile?.email) {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .ilike('company_email', profile.email)
        .single()

      if (employeeError) {
        console.error('Error fetching employee:', employeeError)
      } else {
        employee = employeeData
      }
    }

    // Get teams
    const { data: teamMemberships, error: teamsError } = await supabase
      .from('team_members')
      .select(`
        role,
        teams:team_id (
          id,
          name
        )
      `)
      .eq('user_id', userId)

    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
    }

    // Get scorecards
    const { data: scorecardMemberships, error: scorecardsError } = await supabase
      .from('scorecard_members')
      .select(`
        role,
        scorecards:scorecard_id (
          id,
          name,
          type
        )
      `)
      .eq('user_id', userId)

    if (scorecardsError) {
      console.error('Error fetching scorecards:', scorecardsError)
    }

    // Count teams and scorecards
    const teamCount = teamMemberships?.length || 0
    const scorecardCount = scorecardMemberships?.length || 0

    const user: UserWithProfile = {
      id: authUser.user.id,
      email: authUser.user.email || '',
      profile: profile || null,
      employee: employee || null,
      team_count: teamCount,
      scorecard_count: scorecardCount,
      created_at: authUser.user.created_at,
    }

    const teams =
      teamMemberships?.map((tm: any) => ({
        id: tm.teams.id,
        name: tm.teams.name,
        role: tm.role,
      })) || []

    const scorecards =
      scorecardMemberships?.map((sm: any) => ({
        id: sm.scorecards.id,
        name: sm.scorecards.name,
        type: sm.scorecards.type,
        role: sm.role,
      })) || []

    return {
      data: {
        user,
        teams,
        scorecards,
      },
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error in getUserDetails:', error)
    return { data: null, error: (error as Error).message }
  }
}
