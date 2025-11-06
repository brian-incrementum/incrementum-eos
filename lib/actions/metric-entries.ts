'use server'

import { revalidatePath } from 'next/cache'

import { AuthError, requireUser } from '@/lib/auth/session'
import { getCurrentPeriodStart, toISODate } from '@/lib/utils/date-helpers'

/**
 * Upsert a metric entry for the current period
 */
export async function upsertMetricEntry(
  metricId: string,
  scorecardId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await requireUser()

    // Get metric to determine cadence and scoring mode
    const { data: metric, error: metricError } = await supabase
      .from('metrics')
      .select('cadence, scoring_mode')
      .eq('id', metricId)
      .single()

    if (metricError || !metric) {
      return { success: false, error: 'Metric not found' }
    }

    // Extract form data
    const rawValue = formData.get('value') as string
    const note = formData.get('note') as string
    const customPeriodStart = formData.get('period_start') as string | null

    // Parse value based on scoring mode
    let value: number
    if (metric.scoring_mode === 'yes_no') {
      // For boolean metrics, convert to 1 (true/yes) or 0 (false/no)
      if (rawValue === 'true' || rawValue === '1' || rawValue === 'yes') {
        value = 1
      } else if (rawValue === 'false' || rawValue === '0' || rawValue === 'no') {
        value = 0
      } else {
        return { success: false, error: 'Invalid boolean value' }
      }
    } else {
      // For numeric metrics, parse as float
      value = parseFloat(rawValue)
      if (isNaN(value)) {
        return { success: false, error: 'Invalid value' }
      }
    }

    // Use provided period_start or calculate current period based on cadence
    const periodStartStr = customPeriodStart || toISODate(getCurrentPeriodStart(metric.cadence))

    // Upsert metric entry
    const { error: upsertError } = await supabase
      .from('metric_entries')
      .upsert(
        {
          metric_id: metricId,
          period_start: periodStartStr,
          value,
          note: note || null,
          created_by: user.id,
        },
        {
          onConflict: 'metric_id,period_start',
        }
      )

    if (upsertError) {
      console.error('Error upserting metric entry:', upsertError)
      return { success: false, error: 'Failed to save entry' }
    }

    // Revalidate scorecard detail page
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Error in upsertMetricEntry:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Delete a metric entry
 */
export async function deleteMetricEntry(
  metricId: string,
  periodStart: string,
  scorecardId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireUser()

    // Delete the metric entry
    const { error: deleteError } = await supabase
      .from('metric_entries')
      .delete()
      .eq('metric_id', metricId)
      .eq('period_start', periodStart)

    if (deleteError) {
      console.error('Error deleting metric entry:', deleteError)
      return { success: false, error: 'Failed to delete entry' }
    }

    // Revalidate scorecard detail page
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Error in deleteMetricEntry:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Update note for an existing metric entry
 */
export async function updateEntryNote(
  metricId: string,
  periodStart: string,
  scorecardId: string,
  note: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireUser()

    // Update the note for the specific entry
    const { error: updateError } = await supabase
      .from('metric_entries')
      .update({ note: note || null })
      .eq('metric_id', metricId)
      .eq('period_start', periodStart)

    if (updateError) {
      console.error('Error updating note:', updateError)
      return { success: false, error: 'Failed to update note' }
    }

    // Revalidate scorecard detail page
    revalidatePath(`/scorecards/${scorecardId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Not authenticated' }
    }

    console.error('Error in updateEntryNote:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
