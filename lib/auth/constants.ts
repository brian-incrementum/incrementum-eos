/**
 * Authentication and Authorization Constants
 * Defines role hierarchies and permission levels
 */

export const TEAM_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
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
  [TEAM_ROLES.OWNER]: 3,
  [TEAM_ROLES.ADMIN]: 2,
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
 */
export const TEAM_PERMISSIONS = {
  VIEW_TEAM: [TEAM_ROLES.OWNER, TEAM_ROLES.ADMIN, TEAM_ROLES.MEMBER],
  EDIT_TEAM: [TEAM_ROLES.OWNER, TEAM_ROLES.ADMIN],
  DELETE_TEAM: [TEAM_ROLES.OWNER],
  MANAGE_MEMBERS: [TEAM_ROLES.OWNER, TEAM_ROLES.ADMIN],
  CREATE_SCORECARD: [TEAM_ROLES.OWNER, TEAM_ROLES.ADMIN],
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
