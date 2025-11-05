import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthError, getUser, requireUser } from '@/lib/auth/session'

const mockGetUser = vi.fn()
const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
} as any

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('auth session helpers', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
  })

  it('returns supabase client and user when authenticated', async () => {
    const user = { id: 'user-123', email: 'user@test.dev' }
    mockGetUser.mockResolvedValue({ data: { user }, error: null })

    const result = await requireUser()

    expect(result.user).toEqual(user)
    expect(result.supabase).toBe(mockSupabase)
  })

  it('throws AuthError when no user is present', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(requireUser()).rejects.toBeInstanceOf(AuthError)
  })

  it('returns nullable user from getUser', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const result = await getUser()

    expect(result.user).toBeNull()
    expect(result.supabase).toBe(mockSupabase)
  })
})
