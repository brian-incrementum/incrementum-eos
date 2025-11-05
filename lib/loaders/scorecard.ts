import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, Tables } from '@/lib/types/database.types'
import type { EmployeeWithProfile } from '@/lib/actions/employees'

type Scorecard = Tables<'scorecards'>
type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>
type Profile = Tables<'profiles'>
type Employee = Tables<'employees'>

interface MetricWithEntries extends Metric {
  entries: MetricEntry[]
  owner?: Profile | null
}

export interface ScorecardAggregate {
  scorecard: Scorecard
  metrics: MetricWithEntries[]
  employees: EmployeeWithProfile[]
}

interface LoadScorecardAggregateOptions {
  supabase: SupabaseClient<Database>
  scorecardId: string
}

interface ScorecardLoaderResult {
  data: ScorecardAggregate | null
  error: string | null
}

type TeamMemberWithProfile = {
  user_id: string
  profiles: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'> | null
}

/**
 * Load the full scorecard aggregate used by the detail page, including:
 * - Scorecard record (ensuring it is active)
 * - Metrics with their recent entries
 * - Metric owner profiles
 * - Eligible employees for ownership reassignment
 */
export async function loadScorecardAggregate({
  supabase,
  scorecardId,
}: LoadScorecardAggregateOptions): Promise<ScorecardLoaderResult> {
  const {
    data: scorecard,
    error: scorecardError,
  } = await supabase
    .from('scorecards')
    .select('*')
    .eq('id', scorecardId)
    .eq('is_active', true)
    .single()

  if (scorecardError || !scorecard) {
    console.error('Error loading scorecard', scorecardError)
    return { data: null, error: 'Scorecard not found' }
  }

  const {
    data: metricsData,
    error: metricsError,
  } = await supabase
    .from('metrics')
    .select('*')
    .eq('scorecard_id', scorecardId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (metricsError) {
    console.error('Error loading scorecard metrics', metricsError)
  }

  const metrics = metricsData ?? []
  const metricIds = metrics.map((metric) => metric.id)

  let metricEntries: MetricEntry[] = []
  if (metricIds.length > 0) {
    const {
      data: entriesData,
      error: entriesError,
    } = await supabase
      .from('metric_entries')
      .select('*')
      .in('metric_id', metricIds)
      .order('period_start', { ascending: false })

    if (entriesError) {
      console.error('Error loading metric entries', entriesError)
    } else if (entriesData) {
      metricEntries = entriesData
    }
  }

  const ownerIds = Array.from(
    new Set(
      metrics
        .map((metric) => metric.owner_user_id)
        .filter((value): value is string => Boolean(value))
    )
  )

  const ownersMap = new Map<string, Profile>()
  if (ownerIds.length > 0) {
    const {
      data: ownerProfiles,
      error: ownerProfilesError,
    } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', ownerIds)

    if (ownerProfilesError) {
      console.error('Error loading metric owner profiles', ownerProfilesError)
    } else {
      ownerProfiles?.forEach((profile) => {
        ownersMap.set(profile.id, profile as Profile)
      })
    }
  }

  const entriesByMetricId = metricEntries.reduce<Map<string, MetricEntry[]>>((acc, entry) => {
    const existing = acc.get(entry.metric_id) ?? []
    existing.push(entry)
    acc.set(entry.metric_id, existing)
    return acc
  }, new Map())

  const metricsWithEntries: MetricWithEntries[] = metrics.map((metric) => ({
    ...metric,
    entries: entriesByMetricId.get(metric.id) ?? [],
    owner: metric.owner_user_id ? ownersMap.get(metric.owner_user_id) ?? null : null,
  }))

  const employees = await loadEmployeesForScorecard({ supabase, scorecard })

  return {
    data: {
      scorecard,
      metrics: metricsWithEntries,
      employees,
    },
    error: null,
  }
}

async function loadEmployeesForScorecard({
  supabase,
  scorecard,
}: {
  supabase: SupabaseClient<Database>
  scorecard: Scorecard
}): Promise<EmployeeWithProfile[]> {
  if (scorecard.team_id) {
    return loadTeamEmployees({ supabase, teamId: scorecard.team_id })
  }

  return loadAllEmployees({ supabase })
}

async function loadTeamEmployees({
  supabase,
  teamId,
}: {
  supabase: SupabaseClient<Database>
  teamId: string
}): Promise<EmployeeWithProfile[]> {
  const {
    data: teamMembersData,
    error: teamMembersError,
  } = await supabase
    .from('team_members')
    .select(
      `
        user_id,
        profiles:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `
    )
    .eq('team_id', teamId)

  if (teamMembersError) {
    console.error('Error loading team members for scorecard employees', teamMembersError)
    return []
  }

  const teamMembers = (teamMembersData ?? []) as TeamMemberWithProfile[]
  const profiles = teamMembers
    .map((member) => member.profiles)
    .filter((profile): profile is NonNullable<TeamMemberWithProfile['profiles']> => Boolean(profile))

  if (profiles.length === 0) {
    return []
  }

  const emails = Array.from(
    new Set(
      profiles
        .map((profile) => profile.email?.toLowerCase())
        .filter((email): email is string => Boolean(email))
    )
  )

  if (emails.length === 0) {
    return []
  }

  const {
    data: employeesData,
    error: employeesError,
  } = await supabase
    .from('employees')
    .select('*')
    .in('company_email', emails)

  if (employeesError) {
    console.error('Error loading employees for team scorecard', employeesError)
    return []
  }

  const employeesByEmail = new Map(
    (employeesData ?? [])
      .filter((employee): employee is Employee & { company_email: string } => Boolean(employee.company_email))
      .map((employee) => [employee.company_email!.toLowerCase(), employee])
  )

  const employeesWithProfiles: EmployeeWithProfile[] = profiles
    .map((profile) => {
      if (!profile.email) {
        return null
      }

      const employeeRecord = employeesByEmail.get(profile.email.toLowerCase())
      if (!employeeRecord) {
        return null
      }

      return {
        ...employeeRecord,
        profile_id: profile.id,
        profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        },
      }
    })
    .filter((employee): employee is EmployeeWithProfile => Boolean(employee))

  // Preserve original team member ordering by profile id
  const ordering = new Map(profiles.map((profile, index) => [profile.id, index]))
  employeesWithProfiles.sort((a, b) => {
    const indexA = ordering.get(a.profile_id) ?? 0
    const indexB = ordering.get(b.profile_id) ?? 0
    return indexA - indexB
  })

  return employeesWithProfiles
}

async function loadAllEmployees({
  supabase,
}: {
  supabase: SupabaseClient<Database>
}): Promise<EmployeeWithProfile[]> {
  const [{ data: employeesData, error: employeesError }, { data: profileIndex, error: profilesError }] =
    await Promise.all([
      supabase
        .from('employees')
        .select('*')
        .order('full_name', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url'),
    ])

  if (employeesError) {
    console.error('Error loading employees for scorecard', employeesError)
    return []
  }

  if (profilesError) {
    console.error('Error loading profiles for employee merge', profilesError)
    return []
  }

  const profileByEmail = new Map(
    (profileIndex ?? [])
      .filter((profile): profile is { id: string; email: string; full_name: string | null; avatar_url: string | null } => Boolean(profile.email))
      .map((profile) => [profile.email.toLowerCase(), profile])
  )

  return (employeesData ?? [])
    .map((employee) => {
      if (!employee.company_email) {
        return null
      }

      const profile = profileByEmail.get(employee.company_email.toLowerCase())
      if (!profile) {
        return null
      }

      return {
        ...employee,
        profile_id: profile.id,
        profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        },
      }
    })
    .filter((employee): employee is EmployeeWithProfile => Boolean(employee))
}
