import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/types/database.types'
import type { ScorecardAggregate } from './scorecard'

interface LoadScorecardAggregateOptions {
  supabase: SupabaseClient<Database>
  scorecardId: string
  userId: string
}

interface ScorecardLoaderResult {
  data: ScorecardAggregate | null
  error: string | null
}

/**
 * Load the full scorecard aggregate using the optimized RPC function.
 * This reduces 5-6 sequential database queries to a single RPC call.
 *
 * @param supabase - Supabase client instance
 * @param scorecardId - UUID of the scorecard to load
 * @param userId - UUID of the current user (for permission validation)
 * @returns Promise resolving to scorecard aggregate or error
 */
export async function loadScorecardAggregateViaRPC({
  supabase,
  scorecardId,
  userId,
}: LoadScorecardAggregateOptions): Promise<ScorecardLoaderResult> {
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'get_scorecard_aggregate',
      {
        p_scorecard_id: scorecardId,
        p_user_id: userId,
      }
    )

    if (rpcError) {
      console.error('Error calling get_scorecard_aggregate RPC:', rpcError)
      return {
        data: null,
        error: 'Failed to load scorecard data',
      }
    }

    // RPC returns { error: string | null, data: ScorecardAggregate | null }
    if (!rpcResult) {
      return {
        data: null,
        error: 'No data returned from RPC',
      }
    }

    // Type assertion: RPC returns JSONB which comes back as plain object
    const result = rpcResult as {
      error: string | null
      data: ScorecardAggregate | null
    }

    if (result.error) {
      return {
        data: null,
        error: result.error,
      }
    }

    if (!result.data) {
      return {
        data: null,
        error: 'Scorecard not found',
      }
    }

    // Fetch archived metrics separately (RPC doesn't include them yet)
    const {
      data: archivedMetricsData,
      error: archivedMetricsError,
    } = await supabase
      .from('metrics')
      .select(`
        *,
        owner:profiles!metrics_owner_user_id_fkey(id, full_name, email, avatar_url)
      `)
      .eq('scorecard_id', scorecardId)
      .eq('is_archived', true)
      .order('archived_at', { ascending: false })

    if (archivedMetricsError) {
      console.error('Error loading archived metrics:', archivedMetricsError)
    }

    // Load entries for archived metrics
    const archivedMetrics = archivedMetricsData || []
    const archivedMetricIds = archivedMetrics.map((m) => m.id)

    let archivedMetricsWithEntries = archivedMetrics.map((metric: any) => ({
      ...metric,
      entries: [],
      owner: metric.owner || null,
    }))

    if (archivedMetricIds.length > 0) {
      const {
        data: archivedEntriesData,
        error: archivedEntriesError,
      } = await supabase
        .from('metric_entries')
        .select('*')
        .in('metric_id', archivedMetricIds)
        .order('period_start', { ascending: false })

      if (!archivedEntriesError && archivedEntriesData) {
        const entriesByMetricId = archivedEntriesData.reduce<Map<string, any[]>>((acc, entry) => {
          const existing = acc.get(entry.metric_id) || []
          existing.push(entry)
          acc.set(entry.metric_id, existing)
          return acc
        }, new Map())

        archivedMetricsWithEntries = archivedMetrics.map((metric: any) => ({
          ...metric,
          entries: entriesByMetricId.get(metric.id) || [],
          owner: metric.owner || null,
        }))
      }
    }

    const data: ScorecardAggregate = {
      ...result.data,
      archivedMetrics: archivedMetricsWithEntries,
    }

    return {
      data,
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error in loadScorecardAggregateViaRPC:', error)
    return {
      data: null,
      error: 'An unexpected error occurred while loading the scorecard',
    }
  }
}
