import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { loadScorecardAggregateViaRPC } from '@/lib/loaders/scorecard-rpc'
import type { Database } from '@/lib/types/database.types'

describe('loadScorecardAggregateViaRPC', () => {
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  it('should successfully load scorecard aggregate via RPC', async () => {
    const mockScorecardId = 'scorecard-123'
    const mockUserId = 'user-456'

    const mockRpcResult = {
      error: null,
      data: {
        scorecard: {
          id: mockScorecardId,
          name: 'Test Scorecard',
          type: 'team' as const,
          owner_user_id: mockUserId,
          team_id: 'team-789',
          role_id: null,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          created_by: mockUserId,
        },
        metrics: [
          {
            id: 'metric-1',
            scorecard_id: mockScorecardId,
            name: 'Revenue',
            description: 'Monthly revenue',
            cadence: 'monthly' as const,
            unit: '$',
            scoring_mode: 'at_least' as const,
            target_value: 100000,
            target_min: null,
            target_max: null,
            target_boolean: null,
            owner_user_id: mockUserId,
            display_order: 0,
            is_active: true,
            created_at: '2025-01-01T00:00:00Z',
            entries: [
              {
                id: 'entry-1',
                metric_id: 'metric-1',
                period_start: '2025-01-01',
                value: 120000,
                note: 'Great month!',
                created_by: mockUserId,
                created_at: '2025-01-01T00:00:00Z',
              },
            ],
            owner: {
              id: mockUserId,
              email: 'test@example.com',
              full_name: 'Test User',
              avatar_url: null,
            },
          },
        ],
        employees: [
          {
            id: 'emp-1',
            click_up_id: null,
            company_email: 'test@example.com',
            full_name: 'Test Employee',
            department: 'Engineering',
            position: 'Developer',
            manager: 'Manager Name',
            slack_id: null,
            photo: null,
            status: 'active',
            synced_at: '2025-01-01T00:00:00Z',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T00:00:00Z',
            profile_id: mockUserId,
            profile: {
              id: mockUserId,
              email: 'test@example.com',
              full_name: 'Test User',
              avatar_url: null,
            },
          },
        ],
      },
    }

    mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: mockRpcResult,
        error: null,
      }),
    } as any

    const result = await loadScorecardAggregateViaRPC({
      supabase: mockSupabase,
      scorecardId: mockScorecardId,
      userId: mockUserId,
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_scorecard_aggregate', {
      p_scorecard_id: mockScorecardId,
      p_user_id: mockUserId,
    })

    expect(result.error).toBeNull()
    expect(result.data).toBeDefined()
    expect(result.data?.scorecard.id).toBe(mockScorecardId)
    expect(result.data?.metrics).toHaveLength(1)
    expect(result.data?.metrics[0].name).toBe('Revenue')
    expect(result.data?.metrics[0].entries).toHaveLength(1)
    expect(result.data?.employees).toHaveLength(1)
  })

  it('should handle RPC error gracefully', async () => {
    const mockScorecardId = 'scorecard-123'
    const mockUserId = 'user-456'

    mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'Database connection failed',
          code: 'PGRST500',
        },
      }),
    } as any

    const result = await loadScorecardAggregateViaRPC({
      supabase: mockSupabase,
      scorecardId: mockScorecardId,
      userId: mockUserId,
    })

    expect(result.error).toBe('Failed to load scorecard data')
    expect(result.data).toBeNull()
  })

  it('should handle RPC returning null data', async () => {
    const mockScorecardId = 'scorecard-123'
    const mockUserId = 'user-456'

    mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    } as any

    const result = await loadScorecardAggregateViaRPC({
      supabase: mockSupabase,
      scorecardId: mockScorecardId,
      userId: mockUserId,
    })

    expect(result.error).toBe('No data returned from RPC')
    expect(result.data).toBeNull()
  })

  it('should handle RPC returning error in result object', async () => {
    const mockScorecardId = 'scorecard-123'
    const mockUserId = 'user-456'

    mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          error: 'Scorecard not found or inactive',
          data: null,
        },
        error: null,
      }),
    } as any

    const result = await loadScorecardAggregateViaRPC({
      supabase: mockSupabase,
      scorecardId: mockScorecardId,
      userId: mockUserId,
    })

    expect(result.error).toBe('Scorecard not found or inactive')
    expect(result.data).toBeNull()
  })

  it('should handle personal scorecard (no team_id)', async () => {
    const mockScorecardId = 'scorecard-personal'
    const mockUserId = 'user-456'

    const mockRpcResult = {
      error: null,
      data: {
        scorecard: {
          id: mockScorecardId,
          name: 'Personal Scorecard',
          type: 'personal' as const,
          owner_user_id: mockUserId,
          team_id: null,
          role_id: null,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          created_by: mockUserId,
        },
        metrics: [],
        employees: [],
      },
    }

    mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: mockRpcResult,
        error: null,
      }),
    } as any

    const result = await loadScorecardAggregateViaRPC({
      supabase: mockSupabase,
      scorecardId: mockScorecardId,
      userId: mockUserId,
    })

    expect(result.error).toBeNull()
    expect(result.data?.scorecard.type).toBe('personal')
    expect(result.data?.scorecard.team_id).toBeNull()
  })

  it('should handle scorecard with no metrics', async () => {
    const mockScorecardId = 'scorecard-empty'
    const mockUserId = 'user-456'

    const mockRpcResult = {
      error: null,
      data: {
        scorecard: {
          id: mockScorecardId,
          name: 'Empty Scorecard',
          type: 'team' as const,
          owner_user_id: mockUserId,
          team_id: 'team-123',
          role_id: null,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          created_by: mockUserId,
        },
        metrics: [],
        employees: [],
      },
    }

    mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: mockRpcResult,
        error: null,
      }),
    } as any

    const result = await loadScorecardAggregateViaRPC({
      supabase: mockSupabase,
      scorecardId: mockScorecardId,
      userId: mockUserId,
    })

    expect(result.error).toBeNull()
    expect(result.data?.metrics).toHaveLength(0)
  })

  it('should handle metric with no entries', async () => {
    const mockScorecardId = 'scorecard-123'
    const mockUserId = 'user-456'

    const mockRpcResult = {
      error: null,
      data: {
        scorecard: {
          id: mockScorecardId,
          name: 'Test Scorecard',
          type: 'team' as const,
          owner_user_id: mockUserId,
          team_id: 'team-789',
          role_id: null,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          created_by: mockUserId,
        },
        metrics: [
          {
            id: 'metric-1',
            scorecard_id: mockScorecardId,
            name: 'New Metric',
            description: null,
            cadence: 'weekly' as const,
            unit: 'count',
            scoring_mode: 'at_least' as const,
            target_value: 10,
            target_min: null,
            target_max: null,
            target_boolean: null,
            owner_user_id: null,
            display_order: 0,
            is_active: true,
            created_at: '2025-01-01T00:00:00Z',
            entries: [],
            owner: null,
          },
        ],
        employees: [],
      },
    }

    mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: mockRpcResult,
        error: null,
      }),
    } as any

    const result = await loadScorecardAggregateViaRPC({
      supabase: mockSupabase,
      scorecardId: mockScorecardId,
      userId: mockUserId,
    })

    expect(result.error).toBeNull()
    expect(result.data?.metrics[0].entries).toHaveLength(0)
    expect(result.data?.metrics[0].owner).toBeNull()
  })

  it('should handle unexpected exceptions', async () => {
    const mockScorecardId = 'scorecard-123'
    const mockUserId = 'user-456'

    mockSupabase = {
      rpc: vi.fn().mockRejectedValue(new Error('Network error')),
    } as any

    const result = await loadScorecardAggregateViaRPC({
      supabase: mockSupabase,
      scorecardId: mockScorecardId,
      userId: mockUserId,
    })

    expect(result.error).toBe('An unexpected error occurred while loading the scorecard')
    expect(result.data).toBeNull()
  })
})
