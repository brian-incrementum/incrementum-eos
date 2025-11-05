'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ProfileCombobox } from '@/components/ui/profile-combobox'
import {
  getRoleById,
  assignUserToRole,
  removeUserFromRole,
  getActiveProfiles,
  type RoleWithMembers,
} from '@/lib/actions/roles'
import type { Tables } from '@/lib/types/database.types'

type Profile = Tables<'profiles'>

interface ViewRoleMembersDialogProps {
  roleId: string
  roleName: string
  employeeCount: number
  isAdmin: boolean
}

export function ViewRoleMembersDialog({
  roleId,
  roleName,
  employeeCount,
  isAdmin,
}: ViewRoleMembersDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roleData, setRoleData] = useState<RoleWithMembers | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  // Fetch role data when dialog opens
  useEffect(() => {
    if (open) {
      fetchRoleData()
      if (isAdmin) {
        fetchProfiles()
      }
    }
  }, [open])

  const fetchRoleData = async () => {
    setIsLoading(true)
    const { data, error: fetchError } = await getRoleById(roleId)
    if (data) {
      setRoleData(data)
    } else if (fetchError) {
      setError(fetchError)
    }
    setIsLoading(false)
  }

  const fetchProfiles = async () => {
    const { data } = await getActiveProfiles()
    if (data) {
      setProfiles(data)
    }
  }

  const handleAddMember = async () => {
    if (!selectedProfileId) {
      setError('Please select a person')
      return
    }

    setError(null)
    setIsAddingMember(true)

    try {
      const { error: assignError } = await assignUserToRole(
        selectedProfileId,
        roleId
      )

      if (assignError) {
        setError(assignError)
        return
      }

      // Reset and refresh
      setSelectedProfileId('')
      setShowAddForm(false)
      await fetchRoleData()
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async (profileId: string) => {
    setError(null)

    try {
      const { error: removeError } = await removeUserFromRole(profileId, roleId)

      if (removeError) {
        setError(removeError)
        return
      }

      await fetchRoleData()
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null)
      setShowAddForm(false)
      setSelectedProfileId('')
    }
    setOpen(newOpen)
  }

  // Get IDs of already assigned profiles to exclude from combobox
  const assignedProfileIds =
    roleData?.members.map((m) => m.profile_id) || []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Users className="mr-1 size-4" />
          {employeeCount}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>People in {roleName}</DialogTitle>
          <DialogDescription>
            {isAdmin
              ? 'View and manage people assigned to this role'
              : 'View people assigned to this role'}
          </DialogDescription>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="space-y-4">
          {isLoading && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading...
            </div>
          )}

          {!isLoading && roleData && (
            <>
              {roleData.members.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No one is assigned to this role yet
                </div>
              ) : (
                <div className="space-y-2">
                  {roleData.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-md border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profile.avatar_url || ''} />
                          <AvatarFallback>
                            {member.profile.full_name
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {member.profile.full_name || member.profile.email}
                          </p>
                          {member.profile.full_name && member.profile.email && (
                            <p className="text-xs text-muted-foreground">
                              {member.profile.email}
                            </p>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.profile_id)}
                        >
                          <X className="size-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && (
                <>
                  {!showAddForm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowAddForm(true)}
                    >
                      <Plus className="mr-2 size-4" />
                      Add Person
                    </Button>
                  ) : (
                    <div className="space-y-3 p-4 rounded-md border bg-muted/20">
                      <ProfileCombobox
                        profiles={profiles}
                        value={selectedProfileId}
                        onValueChange={setSelectedProfileId}
                        placeholder="Select person..."
                        excludeIds={assignedProfileIds}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleAddMember}
                          disabled={isAddingMember || !selectedProfileId}
                          className="flex-1"
                        >
                          {isAddingMember ? 'Adding...' : 'Add'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowAddForm(false)
                            setSelectedProfileId('')
                            setError(null)
                          }}
                          disabled={isAddingMember}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
