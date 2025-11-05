"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddMemberDialog } from "./add-member-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  removeTeamMember,
  updateTeamMemberRole,
  transferTeamOwnership,
} from "@/lib/actions/team-members"
import { TEAM_ROLES, type TeamRole } from "@/lib/auth/constants"
import type { Tables } from "@/lib/types/database.types"

type TeamMember = Tables<"team_members"> & {
  profile: Tables<"profiles">
}

interface TeamMembersProps {
  teamId: string
  members: TeamMember[]
  userRole: TeamRole | null
  currentUserId: string
  isAdmin: boolean
}

export function TeamMembers({
  teamId,
  members,
  userRole,
  currentUserId,
  isAdmin,
}: TeamMembersProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: "remove" | "transfer" | null
    memberId: string | null
    memberName: string | null
  }>({ open: false, type: null, memberId: null, memberName: null })

  const canManage = userRole === TEAM_ROLES.OWNER || isAdmin
  const currentMemberIds = members.map((m) => m.user_id)

  const handleRoleChange = async (memberId: string, newRole: TeamRole) => {
    setError(null)
    setIsLoading(true)

    try {
      const { error: updateError } = await updateTeamMemberRole(
        teamId,
        memberId,
        newRole
      )

      if (updateError) {
        setError(updateError)
        return
      }

      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!confirmDialog.memberId) return

    setError(null)
    setIsLoading(true)

    try {
      const { error: removeError } = await removeTeamMember(
        teamId,
        confirmDialog.memberId
      )

      if (removeError) {
        setError(removeError)
        return
      }

      setConfirmDialog({ open: false, type: null, memberId: null, memberName: null })
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTransferOwnership = async () => {
    if (!confirmDialog.memberId) return

    setError(null)
    setIsLoading(true)

    try {
      const { error: transferError } = await transferTeamOwnership(
        teamId,
        confirmDialog.memberId
      )

      if (transferError) {
        setError(transferError)
        return
      }

      setConfirmDialog({ open: false, type: null, memberId: null, memberName: null })
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    if (role === TEAM_ROLES.OWNER) return <Crown className="size-3" />
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>{members.length} team members</CardDescription>
            </div>
            {canManage && <AddMemberDialog teamId={teamId} currentMemberIds={currentMemberIds} />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => {
              const initials = member.profile.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "U"

              const isCurrentUser = member.user_id === currentUserId
              const isOwner = member.role === TEAM_ROLES.OWNER

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar>
                      {member.profile.avatar_url && (
                        <AvatarImage
                          src={member.profile.avatar_url}
                          alt={member.profile.full_name || "User"}
                        />
                      )}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {member.profile.full_name || member.profile.email}
                          {isCurrentUser && (
                            <span className="text-muted-foreground ml-1">(You)</span>
                          )}
                        </p>
                      </div>
                      <p className="text-muted-foreground text-xs truncate">
                        {member.profile.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isOwner ? "default" : "secondary"}
                      className="gap-1"
                    >
                      {getRoleIcon(member.role)}
                      {member.role}
                    </Badge>

                    {canManage && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {!isOwner && isAdmin && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirmDialog({
                                    open: true,
                                    type: "transfer",
                                    memberId: member.user_id,
                                    memberName: member.profile.full_name || member.profile.email,
                                  })
                                }
                              >
                                Transfer Ownership
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}

                          {(!isOwner || isAdmin) && (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirmDialog({
                                  open: true,
                                  type: "remove",
                                  memberId: member.user_id,
                                  memberName: member.profile.full_name || member.profile.email,
                                })
                              }
                              className="text-red-600 focus:text-red-600"
                            >
                              Remove from Team
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialogs */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog({ open, type: null, memberId: null, memberName: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog.type === "remove" && "Remove Team Member"}
              {confirmDialog.type === "transfer" && "Transfer Team Ownership"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === "remove" &&
                `Are you sure you want to remove ${confirmDialog.memberName} from this team?`}
              {confirmDialog.type === "transfer" &&
                `Are you sure you want to transfer ownership to ${confirmDialog.memberName}? You will become a regular team member.`}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ open: false, type: null, memberId: null, memberName: null })
              }
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialog.type === "remove" ? "destructive" : "default"}
              onClick={
                confirmDialog.type === "remove"
                  ? handleRemoveMember
                  : handleTransferOwnership
              }
              disabled={isLoading}
            >
              {isLoading
                ? "Processing..."
                : confirmDialog.type === "remove"
                  ? "Remove"
                  : "Transfer Ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
