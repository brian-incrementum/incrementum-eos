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
import { EmployeeCombobox } from "@/components/ui/employee-combobox"
import { addTeamMember } from "@/lib/actions/team-members"
import { getActiveEmployees, type EmployeeWithProfile } from "@/lib/actions/employees"
import { TEAM_ROLES, type TeamRole } from "@/lib/auth/constants"

interface AddMemberDialogProps {
  teamId: string
}

export function AddMemberDialog({ teamId }: AddMemberDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUserId) {
      setError("Please select a user")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const { error: addError } = await addTeamMember(
        teamId,
        selectedUserId,
        selectedRole
      )

      if (addError) {
        setError(addError)
        return
      }

      // Reset form
      setSelectedUserId(null)
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
      setSelectedUserId(null)
      setSelectedRole(TEAM_ROLES.MEMBER)
      setError(null)
    }
    setOpen(newOpen)
  }

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
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Add a new member to your team and assign them a role
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="member" className="text-sm font-medium">
                Select Member <span className="text-red-500">*</span>
              </label>
              <EmployeeCombobox
                employees={employees}
                value={selectedUserId || undefined}
                onValueChange={setSelectedUserId}
                placeholder="Search for a user..."
                disabled={isLoading || isLoadingEmployees}
              />
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
                  <SelectItem value={TEAM_ROLES.ADMIN}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Admin</span>
                      <span className="text-muted-foreground text-xs">
                        Can manage members and create scorecards
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value={TEAM_ROLES.OWNER}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Owner</span>
                      <span className="text-muted-foreground text-xs">
                        Full control over team settings and members
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
            <Button type="submit" disabled={isLoading || !selectedUserId}>
              {isLoading ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
