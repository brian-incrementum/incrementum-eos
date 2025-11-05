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

    return {
      data: result.data,
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
