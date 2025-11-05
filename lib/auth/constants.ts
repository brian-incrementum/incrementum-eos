/**
 * Authentication and Authorization Constants
 * Defines role hierarchies and permission levels
 */

export const TEAM_ROLES = {
  OWNER: 'owner',
  MEMBER: 'member',
} as const

export type TeamRole = typeof TEAM_ROLES[keyof typeof TEAM_ROLES]

export const SCORECARD_ROLES = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const

export type ScorecardRole = typeof SCORECARD_ROLES[keyof typeof SCORECARD_ROLES]

/**
 * Role hierarchy for teams
 * Higher number = more permissions
 */
export const TEAM_ROLE_HIERARCHY: Record<TeamRole, number> = {
  [TEAM_ROLES.OWNER]: 2,
  [TEAM_ROLES.MEMBER]: 1,
}

/**
 * Role hierarchy for scorecards
 * Higher number = more permissions
 */
export const SCORECARD_ROLE_HIERARCHY: Record<ScorecardRole, number> = {
  [SCORECARD_ROLES.OWNER]: 3,
  [SCORECARD_ROLES.EDITOR]: 2,
  [SCORECARD_ROLES.VIEWER]: 1,
}

/**
 * Permission levels for team operations
 * Only owners can edit teams and manage members.
 * All team members can view the team.
 */
export const TEAM_PERMISSIONS = {
  VIEW_TEAM: [TEAM_ROLES.OWNER, TEAM_ROLES.MEMBER],
  EDIT_TEAM: [TEAM_ROLES.OWNER],
  DELETE_TEAM: [TEAM_ROLES.OWNER],
  MANAGE_MEMBERS: [TEAM_ROLES.OWNER],
  CREATE_SCORECARD: [TEAM_ROLES.OWNER],
  ARCHIVE_TEAM: [TEAM_ROLES.OWNER],
} as const

/**
 * Permission levels for scorecard operations
 */
export const SCORECARD_PERMISSIONS = {
  VIEW_SCORECARD: [SCORECARD_ROLES.OWNER, SCORECARD_ROLES.EDITOR, SCORECARD_ROLES.VIEWER],
  EDIT_SCORECARD: [SCORECARD_ROLES.OWNER],
  DELETE_SCORECARD: [SCORECARD_ROLES.OWNER],
  MANAGE_METRICS: [SCORECARD_ROLES.OWNER, SCORECARD_ROLES.EDITOR],
  ADD_ENTRIES: [SCORECARD_ROLES.OWNER, SCORECARD_ROLES.EDITOR],
  MANAGE_MEMBERS: [SCORECARD_ROLES.OWNER],
} as const

/**
 * Manager permissions
 * Defines what operations managers can perform on their direct reports' data
 */
export const MANAGER_PERMISSIONS = {
  // Managers can view their direct reports' role scorecards
  VIEW_REPORT_ROLE_SCORECARD: true,
  // Managers can create role scorecards for their direct reports
  CREATE_REPORT_ROLE_SCORECARD: true,
  // Managers cannot edit their reports' role scorecards (view-only)
  EDIT_REPORT_ROLE_SCORECARD: false,
  // Managers cannot delete their reports' role scorecards
  DELETE_REPORT_ROLE_SCORECARD: false,
} as const
