'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ShieldOff } from 'lucide-react'
import { updateUserAdminStatus } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface UserAdminToggleProps {
  userId: string
  isAdmin: boolean
  isCurrentUser: boolean
}

export function UserAdminToggle({
  userId,
  isAdmin,
  isCurrentUser,
}: UserAdminToggleProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async () => {
    if (isCurrentUser) {
      setError('You cannot change your own admin status')
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const result = await updateUserAdminStatus(userId, !isAdmin)

      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Failed to update admin status')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isAdmin ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading || isCurrentUser}
        title={isCurrentUser ? 'Cannot change your own admin status' : undefined}
      >
        {isAdmin ? (
          <>
            <Shield className="mr-2 size-4" />
            Admin
          </>
        ) : (
          <>
            <ShieldOff className="mr-2 size-4" />
            User
          </>
        )}
      </Button>
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  )
}
