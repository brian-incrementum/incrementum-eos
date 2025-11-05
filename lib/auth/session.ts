import { redirect } from 'next/navigation'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'

export class AuthError extends Error {
  constructor(message: string = 'Not authenticated') {
    super(message)
    this.name = 'AuthError'
  }
}

export interface AuthContext {
  supabase: SupabaseClient<Database>
  user: User
}

/**
 * Retrieve the current authenticated user or throw/redirect when missing.
 *
 * @example
 * ```ts
 * const { supabase, user } = await requireUser()
 * ```
 */
export async function requireUser(options?: {
  redirectTo?: string
}): Promise<AuthContext> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.error('Error fetching authenticated user', error)
  }

  if (!user) {
    if (options?.redirectTo) {
      redirect(options.redirectTo)
    }

    throw new AuthError()
  }

  return { supabase, user }
}

/**
 * Retrieve the current user without enforcing authentication.
 */
export async function getUser(): Promise<{
  supabase: SupabaseClient<Database>
  user: User | null
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
}
