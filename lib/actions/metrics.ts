'use server'

import { revalidatePath } from 'next/cache'

import { AuthError, requireUser } from '@/lib/auth/session'

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
    const { supabase } = await requireUser()

    // Extract and validate form data
    const name = formData.get('name') as string
    const description = (formData.get('description') as string) || null
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
        description,
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
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

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
    const { supabase } = await requireUser()

    // Extract and validate form data
    const name = formData.get('name') as string
    const description = (formData.get('description') as string) || null
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
        description,
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
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Unexpected error in updateMetric:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Archive a metric (soft delete with metadata)
 */
export async function archiveMetric(
  metricId: string,
  scorecardId: string,
  archiveReason?: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { supabase, user } = await requireUser()

    // Archive the metric
    const { error: archiveError } = await supabase
      .from('metrics')
      .update({
        is_active: false,
        is_archived: true,
        archived_at: new Date().toISOString(),
        archived_by: user.id,
        archive_reason: archiveReason || null,
      })
      .eq('id', metricId)
      .eq('scorecard_id', scorecardId)

    if (archiveError) {
      console.error('Error archiving metric:', archiveError)
      return { success: false, error: 'Failed to archive metric' }
    }

    // Revalidate the scorecard page
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Unexpected error in archiveMetric:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Restore an archived metric
 */
export async function restoreMetric(
  metricId: string,
  scorecardId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { supabase } = await requireUser()

    // Restore the metric
    const { error: restoreError } = await supabase
      .from('metrics')
      .update({
        is_active: true,
        is_archived: false,
        archived_at: null,
        archived_by: null,
        archive_reason: null,
      })
      .eq('id', metricId)
      .eq('scorecard_id', scorecardId)

    if (restoreError) {
      console.error('Error restoring metric:', restoreError)
      return { success: false, error: 'Failed to restore metric' }
    }

    // Revalidate the scorecard page
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Unexpected error in restoreMetric:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Permanently delete a metric (hard delete)
 * WARNING: This will cascade delete all metric entries
 */
export async function hardDeleteMetric(
  metricId: string,
  scorecardId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { supabase } = await requireUser()

    // Permanently delete the metric
    const { error: deleteError } = await supabase
      .from('metrics')
      .delete()
      .eq('id', metricId)
      .eq('scorecard_id', scorecardId)

    if (deleteError) {
      console.error('Error permanently deleting metric:', deleteError)
      return { success: false, error: 'Failed to permanently delete metric' }
    }

    // Revalidate the scorecard page
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Unexpected error in hardDeleteMetric:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Soft delete a metric (legacy function - use archiveMetric instead)
 * @deprecated Use archiveMetric instead
 */
export async function deleteMetric(
  metricId: string,
  scorecardId: string
): Promise<{
  success: boolean
  error?: string
}> {
  return archiveMetric(metricId, scorecardId)
}

/**
 * Reorder metrics by updating their display_order
 */
export async function reorderMetrics(
  metricOrders: { id: string; display_order: number }[],
  scorecardId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const { supabase } = await requireUser()

    // Update each metric's display_order in a transaction-like batch
    const updates = metricOrders.map((metric) =>
      supabase
        .from('metrics')
        .update({ display_order: metric.display_order })
        .eq('id', metric.id)
        .eq('scorecard_id', scorecardId)
    )

    const results = await Promise.all(updates)

    // Check if any updates failed
    const failedUpdate = results.find((result) => result.error)
    if (failedUpdate?.error) {
      console.error('Error reordering metrics:', failedUpdate.error)
      return { success: false, error: 'Failed to reorder metrics' }
    }

    // Revalidate the scorecard page
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Unexpected error in reorderMetrics:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
