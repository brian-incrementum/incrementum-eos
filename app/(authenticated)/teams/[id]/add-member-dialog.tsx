"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { addTeamMember } from "@/lib/actions/team-members"
import { getActiveEmployees, type EmployeeWithProfile } from "@/lib/actions/employees"
import { TEAM_ROLES, type TeamRole } from "@/lib/auth/constants"

interface AddMemberDialogProps {
  teamId: string
  currentMemberIds: string[]
}

export function AddMemberDialog({ teamId, currentMemberIds }: AddMemberDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState<TeamRole>(TEAM_ROLES.MEMBER)
  const [employees, setEmployees] = useState<EmployeeWithProfile[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)

  // Fetch employees when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingEmployees(true)
      getActiveEmployees().then(({ employees, error }) => {
        if (employees) {
          setEmployees(employees)
        }
        setIsLoadingEmployees(false)
      })
    }
  }, [open])

  const toggleUserId = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedUserIds.length === 0) {
      setError("Please select at least one user")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      // Add each selected user to the team
      for (const userId of selectedUserIds) {
        const { error: addError } = await addTeamMember(
          teamId,
          userId,
          selectedRole
        )

        if (addError) {
          setError(`Failed to add some members: ${addError}`)
          setIsLoading(false)
          return
        }
      }

      // Reset form
      setSelectedUserIds([])
      setSelectedRole(TEAM_ROLES.MEMBER)
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setSelectedUserIds([])
      setSelectedRole(TEAM_ROLES.MEMBER)
      setError(null)
    }
    setOpen(newOpen)
  }

  // Filter out employees who are already team members
  const availableEmployees = employees.filter(
    (emp) => !currentMemberIds.includes(emp.profile_id)
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 size-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Team Members</DialogTitle>
            <DialogDescription>
              Select one or more members to add to your team and assign them a role
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Members <span className="text-red-500">*</span>
              </label>
              <div className="rounded-md border max-h-[300px] overflow-y-auto">
                {isLoadingEmployees ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading employees...
                  </div>
                ) : availableEmployees.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No employees available to add
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {availableEmployees.map((employee) => (
                      <div
                        key={employee.profile_id}
                        className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm"
                      >
                        <Checkbox
                          id={`member-${employee.profile_id}`}
                          checked={selectedUserIds.includes(employee.profile_id)}
                          onCheckedChange={() => toggleUserId(employee.profile_id)}
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor={`member-${employee.profile_id}`}
                          className="flex-1 cursor-pointer text-sm"
                        >
                          {employee.profile?.full_name || employee.profile?.email || "Unknown"}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedUserIds.length} member{selectedUserIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Role <span className="text-red-500">*</span>
              </label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setSelectedRole(value as TeamRole)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TEAM_ROLES.MEMBER}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Member</span>
                      <span className="text-muted-foreground text-xs">
                        Can view team and participate in assigned scorecards
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value={TEAM_ROLES.OWNER}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Owner</span>
                      <span className="text-muted-foreground text-xs">
                        Full control over team settings, members, and scorecards
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || selectedUserIds.length === 0}>
              {isLoading ? "Adding..." : `Add ${selectedUserIds.length} Member${selectedUserIds.length !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
