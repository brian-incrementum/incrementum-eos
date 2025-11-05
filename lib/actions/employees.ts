'use server'

import { AuthError, requireUser } from '@/lib/auth/session'
import type { Tables } from '@/lib/types/database.types'

type Employee = Tables<'employees'>
type Profile = Tables<'profiles'>

export interface EmployeeWithProfile extends Employee {
  profile_id: string
  profile: Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>
}

/**
 * Get all active employees with their linked profile IDs
 */
export async function getActiveEmployees(): Promise<{
  employees: EmployeeWithProfile[] | null
  error: string | null
}> {
  try {
    const { supabase } = await requireUser()

    // Fetch all employees (table only contains active team members)
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('*')
      .order('full_name', { ascending: true })

    if (employeesError) {
      console.error('Error fetching employees:', employeesError)
      return { employees: [], error: null }
    }

    const emails = Array.from(
      new Set(
        (employees ?? [])
          .map((employee) => employee.company_email?.toLowerCase())
          .filter((email): email is string => Boolean(email))
      )
    )

    if (emails.length === 0) {
      return { employees: [], error: null }
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('email', emails)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return { employees: [], error: null }
    }

    const profileMap = new Map<string, Pick<Profile, 'id' | 'email' | 'full_name' | 'avatar_url'>>()
    profiles?.forEach((profile) => {
      if (profile.email) {
        profileMap.set(profile.email.toLowerCase(), profile)
      }
    })

    const employeesWithProfiles: EmployeeWithProfile[] = (employees ?? [])
      .map((employee) => {
        if (!employee.company_email) {
          return null
        }

        const profile = profileMap.get(employee.company_email.toLowerCase())

        if (!profile) {
          return null
        }

        return {
          ...employee,
          profile_id: profile.id,
          profile,
        }
      })
      .filter((e): e is EmployeeWithProfile => Boolean(e))

    return { employees: employeesWithProfiles, error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      return { employees: null, error: 'Not authenticated' }
    }

    console.error('Unexpected error in getActiveEmployees:', error)
    return { employees: null, error: 'An unexpected error occurred' }
  }
}
