import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getScorecardWithMetrics } from '@/lib/actions/metrics'
import { getActiveEmployees } from '@/lib/actions/employees'
import { ScorecardView } from './components/scorecard-view'
import type { Tables } from '@/lib/types/database.types'

type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>
type Profile = Tables<'profiles'>
type Employee = Tables<'employees'>

interface MetricWithEntries extends Metric {
  entries: MetricEntry[]
  owner?: Profile | null
}

export default async function ScorecardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch scorecard with metrics and entries
  const { scorecard, metrics, entries, error } = await getScorecardWithMetrics(id)

  if (error || !scorecard) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error Loading Scorecard
          </h2>
          <p className="text-red-700">{error || 'Scorecard not found'}</p>
          <a
            href="/scorecards"
            className="text-red-800 hover:text-red-900 underline mt-4 inline-block"
          >
            ← Back to Scorecards
          </a>
        </div>
      </div>
    )
  }

  // Group entries by metric
  const entriesByMetric = new Map<string, MetricEntry[]>()
  entries?.forEach((entry) => {
    if (!entriesByMetric.has(entry.metric_id)) {
      entriesByMetric.set(entry.metric_id, [])
    }
    entriesByMetric.get(entry.metric_id)!.push(entry)
  })

  // Fetch owner profiles for all metrics
  const ownerIds = metrics?.map((m) => m.owner_user_id).filter((id): id is string => id !== null) || []
  const uniqueOwnerIds = [...new Set(ownerIds)]

  let ownersMap = new Map<string, Profile>()
  if (uniqueOwnerIds.length > 0) {
    const { data: owners } = await supabase
      .from('profiles')
      .select('*')
      .in('id', uniqueOwnerIds)

    if (owners) {
      owners.forEach((owner) => {
        ownersMap.set(owner.id, owner)
      })
    }
  }

  // Transform metrics to include entries and owner
  const metricsWithEntries: MetricWithEntries[] = (metrics || []).map((metric) => ({
    ...metric,
    entries: entriesByMetric.get(metric.id) || [],
    owner: metric.owner_user_id ? ownersMap.get(metric.owner_user_id) : null,
  }))

  // Fetch employees based on scorecard type
  let employees = []

  if (scorecard.team_id) {
    // For team scorecards, fetch only team members
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select(`
        user_id,
        profiles:user_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('team_id', scorecard.team_id)

    if (teamMembers) {
      // Map team members to employee format with their profiles
      const profileIds = teamMembers.map((tm: any) => tm.profiles.id).filter(Boolean)

      if (profileIds.length > 0) {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('*')
          .in('company_email', teamMembers.map((tm: any) => tm.profiles.email).filter(Boolean))

        // Create employee map by email
        const employeeMap = new Map(employeeData?.map(e => [e.company_email?.toLowerCase(), e]) || [])

        // Combine profile and employee data
        employees = teamMembers.map((tm: any) => ({
          profile: tm.profiles,
          employee: tm.profiles.email ? employeeMap.get(tm.profiles.email.toLowerCase()) : null
        })).filter((e: any) => e.profile)
      }
    }
  } else {
    // For personal/role scorecards, fetch all active employees
    const { employees: allEmployees } = await getActiveEmployees()
    employees = allEmployees || []
  }

  return (
    <ScorecardView
      scorecard={scorecard}
      metrics={metricsWithEntries}
      employees={employees}
      currentUserId={user.id}
    />
  )
}
