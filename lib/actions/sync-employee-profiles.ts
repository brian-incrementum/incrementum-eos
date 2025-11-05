'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Sync employees to profiles by creating profiles for employees that don't have one
 * Matches by email: employees.company_email = profiles.email
 */
export async function syncEmployeeProfiles(): Promise<{
  success: boolean
  error?: string
  synced?: number
}> {
  try {
    const supabase = await createClient()

    // Get current user for auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Fetch all employees
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, company_email, full_name, photo')

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return { success: false, error: 'Failed to fetch employees' }
    }

    if (!employees || employees.length === 0) {
      return { success: true, synced: 0 }
    }

    // Fetch all existing profiles
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return { success: false, error: 'Failed to fetch profiles' }
    }

    // Create a Set of existing profile emails for quick lookup
    const existingEmails = new Set(
      (existingProfiles || []).map((p) => p.email?.toLowerCase())
    )

    // Find employees without profiles
    const employeesNeedingProfiles = employees.filter(
      (employee) =>
        employee.company_email &&
        !existingEmails.has(employee.company_email.toLowerCase())
    )

    if (employeesNeedingProfiles.length === 0) {
      return { success: true, synced: 0 }
    }

    // Create profiles for employees without them
    const profilesToCreate = employeesNeedingProfiles.map((employee) => ({
      id: crypto.randomUUID(),
      email: employee.company_email,
      full_name: employee.full_name,
      avatar_url: employee.photo?.url || null,
      is_active: true,
    }))

    const { error: insertError } = await supabase
      .from('profiles')
      .insert(profilesToCreate)

    if (insertError) {
      console.error('Error creating profiles:', insertError)
      return { success: false, error: 'Failed to create profiles' }
    }

    return {
      success: true,
      synced: profilesToCreate.length,
    }
  } catch (error) {
    console.error('Unexpected error in syncEmployeeProfiles:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
