'use server'

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/types/database.types'
import { syncEmployeeProfiles } from './sync-employee-profiles'

type Employee = Tables<'employees'>

export interface EmployeeWithProfile extends Employee {
  profile_id: string
}

/**
 * Get all active employees with their linked profile IDs
 */
export async function getActiveEmployees(): Promise<{
  employees: EmployeeWithProfile[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { employees: null, error: 'Not authenticated' }
    }

    // Fetch all employees (table only contains active team members)
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true })

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return { employees: [], error: null }
    }

    // Fetch all profiles to match with employees
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return { employees: [], error: null }
    }

    // Create a map of email -> profile_id for quick lookup
    const profileMap = new Map<string, string>()
    profiles?.forEach((profile) => {
      if (profile.email) {
        profileMap.set(profile.email.toLowerCase(), profile.id)
      }
    })

    // Map employees to include profile_id (only include employees with profiles)
    const employeesWithProfiles: EmployeeWithProfile[] = (employees || [])
      .map((employee) => {
        const profile_id = employee.company_email
          ? profileMap.get(employee.company_email.toLowerCase())
          : undefined

        if (!profile_id) {
          return null
        }

        return {
          ...employee,
          profile_id,
        }
      })
      .filter((e): e is EmployeeWithProfile => e !== null)

    return { employees: employeesWithProfiles, error: null }
  } catch (error) {
    console.error('Unexpected error in getActiveEmployees:', error)
    return { employees: null, error: 'An unexpected error occurred' }
  }
}
