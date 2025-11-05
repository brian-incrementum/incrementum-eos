import type { Tables } from '@/lib/types/database.types'

export type ScorecardTable = Tables<'scorecards'>
export type ProfileTable = Tables<'profiles'>
export type TeamTable = Tables<'teams'>
export type RoleTable = Tables<'roles'>

export interface ScorecardWithDetails extends ScorecardTable {
  owner: ProfileTable | null
  team: TeamTable | null
  role: RoleTable | null
  metric_count: number
}
