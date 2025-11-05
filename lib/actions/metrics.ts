'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Tables } from '@/lib/types/database.types'

type Scorecard = Tables<'scorecards'>
type Metric = Tables<'metrics'>
type MetricEntry = Tables<'metric_entries'>

/**
 * Get scorecard with all its metrics and recent entries
 */
export async function getScorecardWithMetrics(scorecardId: string): Promise<{
  scorecard: Scorecard | null
  metrics: Metric[] | null
  entries: MetricEntry[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { scorecard: null, metrics: null, error: 'Not authenticated' }
    }

    // Fetch scorecard
    const { data: scorecard, error: scorecardError } = await supabase
      .from('scorecards')
      .select('*')
      .eq('id', scorecardId)
      .eq('is_active', true)
      .single()

    if (scorecardError || !scorecard) {
      console.error('Error fetching scorecard:', scorecardError)
      return { scorecard: null, metrics: null, error: 'Scorecard not found' }
    }

    // Fetch metrics for this scorecard
    const { data: metrics, error: metricsError } = await supabase
      .from('metrics')
      .select('*')
      .eq('scorecard_id', scorecardId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError)
      return { scorecard, metrics: [], entries: [], error: null }
    }

    // Fetch metric entries for all metrics
    let entries: MetricEntry[] = []
    if (metrics && metrics.length > 0) {
      const metricIds = metrics.map((m) => m.id)

      const { data: entriesData, error: entriesError } = await supabase
        .from('metric_entries')
        .select('*')
        .in('metric_id', metricIds)
        .order('period_start', { ascending: false })

      if (entriesError) {
        console.error('Error fetching entries:', entriesError)
        // Continue without entries rather than failing
      } else {
        entries = entriesData || []
      }
    }

    return { scorecard, metrics: metrics || [], entries, error: null }
  } catch (error) {
    console.error('Unexpected error in getScorecardWithMetrics:', error)
    return { scorecard: null, metrics: null, entries: null, error: 'An unexpected error occurred' }
  }
}

/**
 * Create a new metric
 */
export async function createMetric(
  scorecardId: string,
  formData: FormData
): Promise<{
  success: boolean
  error?: string
  metricId?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Extract and validate form data
    const name = formData.get('name') as string
    const cadence = formData.get('cadence') as 'weekly' | 'monthly' | 'quarterly'
    const scoringMode = formData.get('scoring_mode') as 'at_least' | 'at_most' | 'between' | 'yes_no'
    const unit = (formData.get('unit') as string) || null
    const ownerUserId = (formData.get('owner_user_id') as string) || null
    const targetValue = formData.get('target_value')
      ? parseFloat(formData.get('target_value') as string)
      : null
    const targetMin = formData.get('target_min')
      ? parseFloat(formData.get('target_min') as string)
      : null
    const targetMax = formData.get('target_max')
      ? parseFloat(formData.get('target_max') as string)
      : null
    const targetBoolean = formData.get('target_boolean')
      ? formData.get('target_boolean') === 'true'
      : null

    // Validate required fields
    if (!name || name.trim().length < 3) {
      return { success: false, error: 'Metric name must be at least 3 characters' }
    }

    if (!cadence || !['weekly', 'monthly', 'quarterly'].includes(cadence)) {
      return { success: false, error: 'Invalid cadence' }
    }

    if (!scoringMode || !['at_least', 'at_most', 'between', 'yes_no'].includes(scoringMode)) {
      return { success: false, error: 'Invalid scoring mode' }
    }

    // Validate targets based on scoring mode
    if ((scoringMode === 'at_least' || scoringMode === 'at_most') && targetValue === null) {
      return { success: false, error: 'Target value is required for this scoring mode' }
    }

    if (scoringMode === 'between' && (targetMin === null || targetMax === null)) {
      return { success: false, error: 'Target min and max are required for between mode' }
    }

    if (scoringMode === 'between' && targetMin !== null && targetMax !== null && targetMin >= targetMax) {
      return { success: false, error: 'Target min must be less than target max' }
    }

    if (scoringMode === 'yes_no' && targetBoolean === null) {
      return { success: false, error: 'Target is required for Yes/No mode' }
    }

    // Get next display_order
    const { data: maxOrderData } = await supabase
      .from('metrics')
      .select('display_order')
      .eq('scorecard_id', scorecardId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = maxOrderData ? maxOrderData.display_order + 1 : 0

    // Insert metric
    const { data: metric, error: metricError } = await supabase
      .from('metrics')
      .insert({
        scorecard_id: scorecardId,
        name: name.trim(),
        cadence,
        scoring_mode: scoringMode,
        target_value: targetValue,
        target_min: targetMin,
        target_max: targetMax,
        target_boolean: targetBoolean,
        unit,
        owner_user_id: ownerUserId,
        display_order: nextOrder,
      })
      .select()
      .single()

    if (metricError || !metric) {
      console.error('Error creating metric:', metricError)
      return { success: false, error: 'Failed to create metric' }
    }

    // Auto-add owner as scorecard member if not already a member
    if (ownerUserId) {
      // Check if owner is already a member
      const { data: existingMember } = await supabase
        .from('scorecard_members')
        .select('id')
        .eq('scorecard_id', scorecardId)
        .eq('user_id', ownerUserId)
        .single()

      // If not a member, add them
      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('scorecard_members')
          .insert({
            scorecard_id: scorecardId,
            user_id: ownerUserId,
            role: 'editor',
          })

        if (memberError) {
          console.error('Error adding owner as scorecard member:', memberError)
          // Don't fail the whole operation if membership fails
        }
      }
    }

    // Revalidate the scorecard page
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true, metricId: metric.id }
  } catch (error) {
    console.error('Unexpected error in createMetric:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Update an existing metric
 */
export async function updateMetric(
  metricId: string,
  scorecardId: string,
  formData: FormData
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Extract and validate form data
    const name = formData.get('name') as string
    const cadence = formData.get('cadence') as 'weekly' | 'monthly' | 'quarterly'
    const scoringMode = formData.get('scoring_mode') as 'at_least' | 'at_most' | 'between' | 'yes_no'
    const unit = (formData.get('unit') as string) || null
    const ownerUserId = (formData.get('owner_user_id') as string) || null
    const targetValue = formData.get('target_value')
      ? parseFloat(formData.get('target_value') as string)
      : null
    const targetMin = formData.get('target_min')
      ? parseFloat(formData.get('target_min') as string)
      : null
    const targetMax = formData.get('target_max')
      ? parseFloat(formData.get('target_max') as string)
      : null
    const targetBoolean = formData.get('target_boolean')
      ? formData.get('target_boolean') === 'true'
      : null

    // Validate required fields
    if (!name || name.trim().length < 3) {
      return { success: false, error: 'Metric name must be at least 3 characters' }
    }

    // Validate targets based on scoring mode
    if ((scoringMode === 'at_least' || scoringMode === 'at_most') && targetValue === null) {
      return { success: false, error: 'Target value is required for this scoring mode' }
    }

    if (scoringMode === 'between' && (targetMin === null || targetMax === null)) {
      return { success: false, error: 'Target min and max are required for between mode' }
    }

    if (scoringMode === 'between' && targetMin !== null && targetMax !== null && targetMin >= targetMax) {
      return { success: false, error: 'Target min must be less than target max' }
    }

    if (scoringMode === 'yes_no' && targetBoolean === null) {
      return { success: false, error: 'Target is required for Yes/No mode' }
    }

    // Update metric
    const { error: updateError } = await supabase
      .from('metrics')
      .update({
        name: name.trim(),
        cadence,
        scoring_mode: scoringMode,
        target_value: targetValue,
        target_min: targetMin,
        target_max: targetMax,
        target_boolean: targetBoolean,
        unit,
        owner_user_id: ownerUserId,
      })
      .eq('id', metricId)
      .eq('scorecard_id', scorecardId)

    if (updateError) {
      console.error('Error updating metric:', updateError)
      return { success: false, error: 'Failed to update metric' }
    }

    // Auto-add owner as scorecard member if not already a member
    if (ownerUserId) {
      // Check if owner is already a member
      const { data: existingMember } = await supabase
        .from('scorecard_members')
        .select('id')
        .eq('scorecard_id', scorecardId)
        .eq('user_id', ownerUserId)
        .single()

      // If not a member, add them
      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('scorecard_members')
          .insert({
            scorecard_id: scorecardId,
            user_id: ownerUserId,
            role: 'editor',
          })

        if (memberError) {
          console.error('Error adding owner as scorecard member:', memberError)
          // Don't fail the whole operation if membership fails
        }
      }
    }

    // Revalidate the scorecard page
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in updateMetric:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Soft delete a metric
 */
export async function deleteMetric(
  metricId: string,
  scorecardId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Soft delete (set is_active = false)
    const { error: deleteError } = await supabase
      .from('metrics')
      .update({ is_active: false })
      .eq('id', metricId)
      .eq('scorecard_id', scorecardId)

    if (deleteError) {
      console.error('Error deleting metric:', deleteError)
      return { success: false, error: 'Failed to delete metric' }
    }

    // Revalidate the scorecard page
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in deleteMetric:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
