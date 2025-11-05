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
 * Check if user1 is the manager of user2
 */
export async function isUserManager(
  managerId: string,
  reportId: string,
  supabase?: Supabase
): Promise<boolean> {
  const client = await resolveClient(supabase)

  const { data: report, error } = await client
    .from('profiles')
    .select('manager_id')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    return false
  }

  return report.manager_id === managerId
}

/**
 * Get all direct reports for a user
 */
export async function getDirectReports(
  userId: string,
  supabase?: Supabase
): Promise<string[]> {
  const client = await resolveClient(supabase)

  const { data: reports, error } = await client
    .from('profiles')
    .select('id')
    .eq('manager_id', userId)
    .eq('is_active', true)

  if (error || !reports) {
    return []
  }

  return reports.map((r) => r.id)
}

/**
 * Check if user can view a role scorecard
 * User can view if they:
 * 1. Are the owner
 * 2. Are a member with appropriate role
 * 3. Are a system admin
 * 4. Are the manager of the scorecard owner (for role scorecards only)
 */
export async function canViewRoleScorecard(
  scorecardId: string,
  userId: string,
  supabase?: Supabase
): Promise<boolean> {
  const client = await resolveClient(supabase)

  // System admins can view everything
  if (await isSystemAdmin(userId, client)) {
    return true
  }

  // Check if user has direct access via ownership or membership
  const userRole = await getUserScorecardRole(scorecardId, userId, client)
  if (userRole) {
    return true
  }

  // Check if this is a role scorecard and user is the manager of the owner
  const { data: scorecard, error } = await client
    .from('scorecards')
    .select('type, owner_user_id')
    .eq('id', scorecardId)
    .single()

  if (error || !scorecard || scorecard.type !== 'role') {
    return false
  }

  // Check if userId is the manager of the scorecard owner
  return isUserManager(userId, scorecard.owner_user_id, client)
}

/**
 * Check if user can view a team scorecard
 * User can view if they:
 * 1. Are a system admin
 * 2. Own the scorecard
 * 3. Are a member of the scorecard
 * 4. Are the manager of the team owner (for team scorecards only)
 */
export async function canViewTeamScorecard(
  scorecardId: string,
  userId: string,
  supabase?: Supabase
): Promise<boolean> {
  const client = await resolveClient(supabase)

  // System admins can view everything
  if (await isSystemAdmin(userId, client)) {
    return true
  }

  // Check if user has direct access via ownership or membership
  const userRole = await getUserScorecardRole(scorecardId, userId, client)
  if (userRole) {
    return true
  }

  // Check if this is a team scorecard and user is the manager of the team owner
  const { data: scorecard, error } = await client
    .from('scorecards')
    .select('type, team_id')
    .eq('id', scorecardId)
    .single()

  if (error || !scorecard || scorecard.type !== 'team' || !scorecard.team_id) {
    return false
  }

  // Get the team owner (user with role='owner' in team_members)
  const { data: teamOwnerMember, error: teamOwnerError } = await client
    .from('team_members')
    .select('user_id')
    .eq('team_id', scorecard.team_id)
    .eq('role', 'owner')
    .single()

  if (teamOwnerError || !teamOwnerMember) {
    return false
  }

  // Check if userId is the manager of the team owner
  return isUserManager(userId, teamOwnerMember.user_id, client)
}

/**
 * Check if user can create a role scorecard for another user
 * User can create if they:
 * 1. Are creating for themselves
 * 2. Are the manager of the target user
 * 3. Are a system admin
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
  if (await isSystemAdmin(currentUserId, supabase)) {
    return true
  }

  // Check if current user is manager of target user
  return isUserManager(currentUserId, targetUserId, supabase)
}
