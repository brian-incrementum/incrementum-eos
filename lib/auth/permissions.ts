/**
 * Permission Helper Functions
 * Centralized authorization logic for teams and scorecards
 */

import { createClient } from '@/lib/supabase/server'
import {
  TEAM_ROLES,
  SCORECARD_ROLES,
  TEAM_ROLE_HIERARCHY,
  SCORECARD_ROLE_HIERARCHY,
  type TeamRole,
  type ScorecardRole,
} from './constants'

/**
 * Check if a user is a system administrator
 */
export async function isSystemAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data, error } = await supabase
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
  userId: string
): Promise<TeamRole | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
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
  requiredRole: TeamRole = TEAM_ROLES.MEMBER
): Promise<boolean> {
  // System admins have all permissions
  if (await isSystemAdmin(userId)) {
    return true
  }

  const userRole = await getUserTeamRole(teamId, userId)

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
  requiredRole: TeamRole = TEAM_ROLES.MEMBER
): Promise<void> {
  const hasPermission = await checkTeamPermission(teamId, userId, requiredRole)

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
  userId: string
): Promise<ScorecardRole | null> {
  const supabase = await createClient()

  // First check if user is the owner
  const { data: scorecard } = await supabase
    .from('scorecards')
    .select('owner_user_id')
    .eq('id', scorecardId)
    .single()

  if (scorecard?.owner_user_id === userId) {
    return SCORECARD_ROLES.OWNER
  }

  // Check scorecard_members table
  const { data, error } = await supabase
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
  requiredRole: ScorecardRole = SCORECARD_ROLES.VIEWER
): Promise<boolean> {
  // System admins have all permissions
  if (await isSystemAdmin(userId)) {
    return true
  }

  const userRole = await getUserScorecardRole(scorecardId, userId)

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
  requiredRole: ScorecardRole = SCORECARD_ROLES.VIEWER
): Promise<void> {
  const hasPermission = await checkScorecardPermission(scorecardId, userId, requiredRole)

  if (!hasPermission) {
    throw new Error('Unauthorized: Insufficient scorecard permissions')
  }
}

/**
 * Check if user can manage team members
 * Requires admin or owner role
 */
export async function canManageTeamMembers(
  teamId: string,
  userId: string
): Promise<boolean> {
  return checkTeamPermission(teamId, userId, TEAM_ROLES.ADMIN)
}

/**
 * Check if user can delete/archive team
 * Requires owner role
 */
export async function canDeleteTeam(
  teamId: string,
  userId: string
): Promise<boolean> {
  return checkTeamPermission(teamId, userId, TEAM_ROLES.OWNER)
}

/**
 * Check if user can create scorecards for a team
 * Requires admin or owner role
 */
export async function canCreateTeamScorecard(
  teamId: string,
  userId: string
): Promise<boolean> {
  return checkTeamPermission(teamId, userId, TEAM_ROLES.ADMIN)
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
