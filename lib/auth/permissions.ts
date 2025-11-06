/**
 * Permission Helper Functions
 * Centralized authorization logic for teams and scorecards
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  TEAM_ROLES,
  SCORECARD_ROLES,
  TEAM_ROLE_HIERARCHY,
  SCORECARD_ROLE_HIERARCHY,
  type TeamRole,
  type ScorecardRole,
} from './constants'
import type { Database } from '@/lib/types/database.types'

type Supabase = SupabaseClient<Database>

async function resolveClient(existingClient?: Supabase): Promise<Supabase> {
  if (existingClient) {
    return existingClient
  }

  return createClient()
}

/**
 * Check if a user is a system administrator
 */
export async function isSystemAdmin(userId: string, supabase?: Supabase): Promise<boolean> {
  const client = await resolveClient(supabase)

  const { data, error } = await client
    .from('profiles')
    .select('is_system_admin')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return false
  }

  return data.is_system_admin === true
}

/**
 * Get user's role in a team
 * Returns null if user is not a member
 */
export async function getUserTeamRole(
  teamId: string,
  userId: string,
  supabase?: Supabase
): Promise<TeamRole | null> {
  const client = await resolveClient(supabase)

  const { data, error } = await client
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.role as TeamRole
}

/**
 * Determine whether `managerUserId` manages the user identified by `reportUserId`.
 * Comparison is performed via company email addresses stored on the `profiles` and `employees` tables.
 */
export async function isUserManager(
  managerUserId: string,
  reportUserId: string,
  supabase?: Supabase
): Promise<boolean> {
  const client = await resolveClient(supabase)

  const [{ data: managerProfile }, { data: reportProfile }] = await Promise.all([
    client.from('profiles').select('email').eq('id', managerUserId).single(),
    client.from('profiles').select('email').eq('id', reportUserId).single(),
  ])

  if (!managerProfile?.email || !reportProfile?.email) {
    return false
  }

  const managerEmail = managerProfile.email.toLowerCase()
  const reportEmail = reportProfile.email.toLowerCase()

  const { data: employeeRecord } = await client
    .from('employees')
    .select('manager_email')
    .eq('company_email', reportEmail)
    .single()

  if (!employeeRecord?.manager_email) {
    return false
  }

  return employeeRecord.manager_email.toLowerCase() === managerEmail
}

/**
 * Check if user has required team permission level
 * System admins automatically have all permissions
 */
export async function checkTeamPermission(
  teamId: string,
  userId: string,
  requiredRole: TeamRole = TEAM_ROLES.MEMBER,
  supabase?: Supabase
): Promise<boolean> {
  // System admins have all permissions
  if (await isSystemAdmin(userId, supabase)) {
    return true
  }

  const userRole = await getUserTeamRole(teamId, userId, supabase)

  if (!userRole) {
    return false
  }

  // Check if user's role meets or exceeds required role
  return TEAM_ROLE_HIERARCHY[userRole] >= TEAM_ROLE_HIERARCHY[requiredRole]
}

/**
 * Require team permission - throws error if user lacks permission
 */
export async function requireTeamPermission(
  teamId: string,
  userId: string,
  requiredRole: TeamRole = TEAM_ROLES.MEMBER,
  supabase?: Supabase
): Promise<void> {
  const hasPermission = await checkTeamPermission(teamId, userId, requiredRole, supabase)

  if (!hasPermission) {
    throw new Error('Unauthorized: Insufficient team permissions')
  }
}

/**
 * Get user's role in a scorecard
 * Returns null if user is not a member
 * Also checks if user owns the scorecard directly
 */
export async function getUserScorecardRole(
  scorecardId: string,
  userId: string,
  supabase?: Supabase
): Promise<ScorecardRole | null> {
  const client = await resolveClient(supabase)

  // First check if user is the owner
  const { data: scorecard } = await client
    .from('scorecards')
    .select('owner_user_id')
    .eq('id', scorecardId)
    .single()

  if (scorecard?.owner_user_id === userId) {
    return SCORECARD_ROLES.OWNER
  }

  // Check scorecard_members table
  const { data, error } = await client
    .from('scorecard_members')
    .select('role')
    .eq('scorecard_id', scorecardId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.role as ScorecardRole
}

/**
 * Check if user has required scorecard permission level
 * System admins automatically have all permissions
 */
export async function checkScorecardPermission(
  scorecardId: string,
  userId: string,
  requiredRole: ScorecardRole = SCORECARD_ROLES.VIEWER,
  supabase?: Supabase
): Promise<boolean> {
  // System admins have all permissions
  if (await isSystemAdmin(userId, supabase)) {
    return true
  }

  const userRole = await getUserScorecardRole(scorecardId, userId, supabase)

  if (!userRole) {
    return false
  }

  // Check if user's role meets or exceeds required role
  return SCORECARD_ROLE_HIERARCHY[userRole] >= SCORECARD_ROLE_HIERARCHY[requiredRole]
}

/**
 * Require scorecard permission - throws error if user lacks permission
 */
export async function requireScorecardPermission(
  scorecardId: string,
  userId: string,
  requiredRole: ScorecardRole = SCORECARD_ROLES.VIEWER,
  supabase?: Supabase
): Promise<void> {
  const hasPermission = await checkScorecardPermission(scorecardId, userId, requiredRole, supabase)

  if (!hasPermission) {
    throw new Error('Unauthorized: Insufficient scorecard permissions')
  }
}

/**
 * Check if user can manage team members
 * Requires owner role
 */
export async function canManageTeamMembers(
  teamId: string,
  userId: string,
  supabase?: Supabase
): Promise<boolean> {
  return checkTeamPermission(teamId, userId, TEAM_ROLES.OWNER, supabase)
}

/**
 * Check if user can delete/archive team
 * Requires owner role
 */
export async function canDeleteTeam(
  teamId: string,
  userId: string,
  supabase?: Supabase
): Promise<boolean> {
  return checkTeamPermission(teamId, userId, TEAM_ROLES.OWNER, supabase)
}

/**
 * Check if user can create scorecards for a team
 * Requires owner role
 */
export async function canCreateTeamScorecard(
  teamId: string,
  userId: string,
  supabase?: Supabase
): Promise<boolean> {
  return checkTeamPermission(teamId, userId, TEAM_ROLES.OWNER, supabase)
}

/**
 * Require system admin access
 */
export async function requireSystemAdmin(userId: string): Promise<void> {
  const isAdmin = await isSystemAdmin(userId)

  if (!isAdmin) {
    throw new Error('Unauthorized: System administrator access required')
  }
}

/**
 * Check if user can create a role scorecard for another user
 * Simplified: Users can only create for themselves (or admins for anyone)
 */
export async function canCreateRoleScorecardFor(
  targetUserId: string,
  currentUserId: string,
  supabase?: Supabase
): Promise<boolean> {
  // Users can create their own scorecards
  if (targetUserId === currentUserId) {
    return true
  }

  // System admins can create for anyone
  return await isSystemAdmin(currentUserId, supabase)
}
