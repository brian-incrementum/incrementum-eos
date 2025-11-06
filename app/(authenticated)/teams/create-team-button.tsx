"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { EmployeeCombobox } from "@/components/ui/employee-combobox"
import { createTeam } from "@/lib/actions/teams"
import { getActiveEmployees, type EmployeeWithProfile } from "@/lib/actions/employees"

interface CreateTeamButtonProps {
  variant?: "default" | "outline" | "ghost"
  isAdmin?: boolean
}

export function CreateTeamButton({ variant = "outline", isAdmin = false }: CreateTeamButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // Admin-specific state
  const [employees, setEmployees] = useState<EmployeeWithProfile[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  // Fetch employees when dialog opens (admin only)
  useEffect(() => {
    if (open && isAdmin) {
      setIsLoadingEmployees(true)
      getActiveEmployees().then(({ employees, error }) => {
        if (employees) {
          setEmployees(employees)
        }
        setIsLoadingEmployees(false)
      })
    }
  }, [open, isAdmin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation for admin
    if (isAdmin && !selectedOwnerId) {
      setError("Please select a team owner")
      return
    }

    setIsLoading(true)

    try {
      const { data, error: createError } = await createTeam({
        name: formData.name,
        description: formData.description || undefined,
        ...(isAdmin && {
          ownerId: selectedOwnerId!,
          memberIds: selectedMemberIds,
        }),
      })

      if (createError) {
        setError(createError)
        return
      }

      if (data) {
        // Reset form
        setOpen(false)
        setFormData({ name: "", description: "" })
        setSelectedOwnerId(null)
        setSelectedMemberIds([])
        router.push(`/teams/${data.id}`)
        router.refresh()
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setFormData({ name: "", description: "" })
      setSelectedOwnerId(null)
      setSelectedMemberIds([])
      setError(null)
    }
    setOpen(newOpen)
  }

  const toggleMemberId = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant}>
          <Plus className="mr-2 size-4" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a new team</DialogTitle>
            <DialogDescription>
              {isAdmin
                ? "Create a team and assign an owner and members"
                : "Teams help you collaborate on scorecards and track metrics together"}
            </DialogDescription>
          </DialogHeader>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Team Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                placeholder="Engineering Team"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-muted-foreground text-xs">(optional)</span>
              </label>
              <textarea
                id="description"
                placeholder="What is this team about?"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                disabled={isLoading}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Admin-specific fields */}
            {isAdmin && (
              <>
                <Separator />

                <div className="space-y-2">
                  <label htmlFor="owner" className="text-sm font-medium">
                    Team Owner <span className="text-red-500">*</span>
                  </label>
                  <EmployeeCombobox
                    employees={employees}
                    value={selectedOwnerId ?? ''}
                    onValueChange={(value) => setSelectedOwnerId(value || null)}
                    placeholder="Select team owner..."
                    disabled={isLoading || isLoadingEmployees}
                  />
                  <p className="text-xs text-muted-foreground">
                    The owner will have full control over team settings and members
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Additional Members <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <div className="rounded-md border max-h-[200px] overflow-y-auto">
                    {isLoadingEmployees ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading employees...
                      </div>
                    ) : employees.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No employees found
                      </div>
                    ) : (
                      <div className="p-2 space-y-2">
                        {employees
                          .filter((emp) => emp.profile_id !== selectedOwnerId)
                          .map((employee) => (
                            <div
                              key={employee.profile_id}
                              className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm"
                            >
                              <Checkbox
                                id={`member-${employee.profile_id}`}
                                checked={selectedMemberIds.includes(employee.profile_id)}
                                onCheckedChange={() => toggleMemberId(employee.profile_id)}
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
                    {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              </>
            )}

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
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim() || (isAdmin && !selectedOwnerId)}
            >
              {isLoading ? "Creating..." : "Create Team"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
