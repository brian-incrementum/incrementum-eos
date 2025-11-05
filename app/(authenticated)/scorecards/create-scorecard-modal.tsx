'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createScorecard } from '@/lib/actions/scorecards'
import { getAllTeams } from '@/lib/actions/teams'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/types/database.types'

type ScorecardType = 'team' | 'role'

interface CreateScorecardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin: boolean
}

export function CreateScorecardModal({
  open,
  onOpenChange,
  isAdmin,
}: CreateScorecardModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<ScorecardType>('team')
  const [teamId, setTeamId] = useState<string>('')
  const [roleId, setRoleId] = useState<string>('')
  const [ownerId, setOwnerId] = useState<string>('')
  const [teams, setTeams] = useState<Tables<'teams'>[]>([])
  const [roles, setRoles] = useState<Tables<'roles'>[]>([])
  const [employees, setEmployees] = useState<Tables<'profiles'>[]>([])
  const [employeeRoles, setEmployeeRoles] = useState<Tables<'roles'>[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch teams and roles when modal opens
  useEffect(() => {
    if (open && isAdmin) {
      setIsLoading(true)
      const supabase = createClient()

      Promise.all([
        getAllTeams(),
        supabase.from('roles').select('*').order('display_order'),
        supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
      ]).then(([teamsResult, rolesResult, employeesResult]) => {
        if (teamsResult.data) {
          setTeams(teamsResult.data)
        }
        if (rolesResult.data) {
          setRoles(rolesResult.data)
        }
        if (employeesResult.data) {
          setEmployees(employeesResult.data)
        }
        setIsLoading(false)
      })
    }
  }, [open, isAdmin])

  // Fetch employee's roles when employee is selected for role scorecard
  useEffect(() => {
    if (type === 'role' && ownerId) {
      const supabase = createClient()
      supabase
        .from('employee_roles')
        .select('role_id, roles(*)')
        .eq('profile_id', ownerId)
        .then(({ data }) => {
          if (data) {
            const employeeRolesList = data
              .map((er: any) => er.roles)
              .filter(Boolean) as Tables<'roles'>[]
            setEmployeeRoles(employeeRolesList)
          }
        })
    }
  }, [type, ownerId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    // Validate based on type
    if (type === 'team' && !teamId) {
      setError('Please select a team')
      return
    }

    if (type === 'team' && !ownerId) {
      setError('Please select a team owner')
      return
    }

    if (type === 'role' && !ownerId) {
      setError('Please select an employee')
      return
    }

    if (type === 'role' && !roleId) {
      setError('Please select a role')
      return
    }

    const formData = new FormData()
    formData.append('type', type)
    formData.append('owner_user_id', ownerId)

    if (type === 'team' && teamId) {
      formData.append('team_id', teamId)
    }

    if (type === 'role' && roleId) {
      formData.append('role_id', roleId)
    }

    startTransition(async () => {
      const result = await createScorecard(formData)

      if (result.success && result.scorecardId) {
        // Reset form
        setType('team')
        setTeamId('')
        setRoleId('')
        setOwnerId('')
        setEmployeeRoles([])
        onOpenChange(false)
        router.push(`/scorecards/${result.scorecardId}`)
        router.refresh()
      } else {
        setError(result.error || 'Failed to create scorecard')
      }
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setType('team')
      setTeamId('')
      setRoleId('')
      setOwnerId('')
      setEmployeeRoles([])
      setError(null)
    }
    onOpenChange(newOpen)
  }

  if (!isAdmin) {
    return null
  }

  const selectedTeam = teams.find((t) => t.id === teamId)
  const selectedRole = employeeRoles.find((r) => r.id === roleId)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create New Scorecard</DialogTitle>
          <DialogDescription>
            Create a team scorecard or a role scorecard. Names are automatically generated.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {/* Type Selection */}
            <div className="grid gap-3">
              <label className="text-sm font-medium">
                Scorecard Type <span className="text-red-500">*</span>
              </label>
              <RadioGroup
                value={type}
                onValueChange={(value) => {
                  setType(value as ScorecardType)
                  setTeamId('')
                  setRoleId('')
                  setOwnerId('')
                  setEmployeeRoles([])
                }}
                disabled={isPending}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="font-normal cursor-pointer">
                    <div>
                      <div className="font-medium">Team Scorecard</div>
                      <div className="text-muted-foreground text-xs">
                        One scorecard per team for shared metrics
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="role" id="role" />
                  <Label htmlFor="role" className="font-normal cursor-pointer">
                    <div>
                      <div className="font-medium">Role Scorecard</div>
                      <div className="text-muted-foreground text-xs">
                        Track role-specific metrics for an employee
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Team Scorecard Fields */}
            {type === 'team' && (
              <>
                <div className="grid gap-2">
                  <label htmlFor="team-select" className="text-sm font-medium">
                    Select Team <span className="text-red-500">*</span>
                  </label>
                  {isLoading ? (
                    <div className="text-sm text-muted-foreground">Loading teams...</div>
                  ) : teams.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No teams available. Create a team first.
                    </div>
                  ) : (
                    <Select value={teamId} onValueChange={setTeamId} disabled={isPending}>
                      <SelectTrigger id="team-select">
                        <SelectValue placeholder="Choose a team..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedTeam && (
                    <p className="text-sm text-muted-foreground">
                      Scorecard name: <span className="font-medium">{selectedTeam.name}</span>
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <label htmlFor="team-owner" className="text-sm font-medium">
                    Team Owner <span className="text-red-500">*</span>
                  </label>
                  <Select value={ownerId} onValueChange={setOwnerId} disabled={isPending}>
                    <SelectTrigger id="team-owner">
                      <SelectValue placeholder="Choose team owner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.full_name || employee.email || 'Unknown'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Role Scorecard Fields */}
            {type === 'role' && (
              <>
                <div className="grid gap-2">
                  <label htmlFor="employee-select" className="text-sm font-medium">
                    Select Employee <span className="text-red-500">*</span>
                  </label>
                  {isLoading ? (
                    <div className="text-sm text-muted-foreground">Loading employees...</div>
                  ) : employees.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No employees available.</div>
                  ) : (
                    <Select
                      value={ownerId}
                      onValueChange={(value) => {
                        setOwnerId(value)
                        setRoleId('') // Reset role when employee changes
                      }}
                      disabled={isPending}
                    >
                      <SelectTrigger id="employee-select">
                        <SelectValue placeholder="Choose an employee..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.full_name || employee.email || 'Unknown'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {ownerId && (
                  <div className="grid gap-2">
                    <label htmlFor="role-select" className="text-sm font-medium">
                      Select Role <span className="text-red-500">*</span>
                    </label>
                    {employeeRoles.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        This employee has no assigned roles. Assign a role first.
                      </div>
                    ) : (
                      <>
                        <Select value={roleId} onValueChange={setRoleId} disabled={isPending}>
                          <SelectTrigger id="role-select">
                            <SelectValue placeholder="Choose a role..." />
                          </SelectTrigger>
                          <SelectContent>
                            {employeeRoles.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedRole && (
                          <p className="text-sm text-muted-foreground">
                            Scorecard name: <span className="font-medium">{selectedRole.name}</span>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isPending ||
                !ownerId ||
                (type === 'team' && !teamId) ||
                (type === 'role' && !roleId)
              }
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              {isPending ? 'Creating...' : 'Create Scorecard'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
