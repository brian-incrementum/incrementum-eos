'use client'

import { useState, useTransition, useEffect } from 'react'
import { X, UserPlus, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { EmployeeCombobox } from '@/components/ui/employee-combobox'
import { updateScorecard } from '@/lib/actions/scorecards'
import {
  getScorecardMembers,
  addScorecardMember,
  removeScorecardMember,
  updateMemberRole,
  type MemberWithProfile,
} from '@/lib/actions/scorecard-members'
import type { Tables } from '@/lib/types/database.types'
import type { EmployeeWithProfile } from '@/lib/actions/employees'

type Scorecard = Tables<'scorecards'>

interface EditScorecardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scorecard: Scorecard
  employees: EmployeeWithProfile[]
  currentUserId: string
}

export function EditScorecardSheet({
  open,
  onOpenChange,
  scorecard,
  employees,
  currentUserId,
}: EditScorecardSheetProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('editor')

  // Load members when sheet opens
  useEffect(() => {
    if (open) {
      loadMembers()
    }
  }, [open, scorecard.id])

  const loadMembers = () => {
    startTransition(async () => {
      const result = await getScorecardMembers(scorecard.id)
      if (result.error) {
        setError(result.error)
      } else {
        setMembers(result.members || [])
      }
    })
  }


  const handleAddMember = () => {
    if (!selectedEmployeeId) return

    setError(null)
    startTransition(async () => {
      const result = await addScorecardMember(scorecard.id, selectedEmployeeId, selectedRole)

      if (result.error) {
        setError(result.error)
      } else {
        setSelectedEmployeeId('')
        setSelectedRole('editor')
        loadMembers()
      }
    })
  }

  const handleRemoveMember = (memberId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await removeScorecardMember(scorecard.id, memberId)

      if (result.error) {
        setError(result.error)
      } else {
        loadMembers()
      }
    })
  }

  const handleRoleChange = (memberId: string, newRole: 'owner' | 'editor' | 'viewer') => {
    setError(null)
    startTransition(async () => {
      const result = await updateMemberRole(scorecard.id, memberId, newRole)

      if (result.error) {
        setError(result.error)
      } else {
        loadMembers()
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0 flex flex-col">
        <SheetHeader className="px-6 py-6 border-b border-gray-200">
          <SheetTitle className="text-xl font-semibold text-gray-900">
            {scorecard.name || 'Scorecard'}
          </SheetTitle>
          <SheetDescription className="text-gray-600 mt-1">
            Manage scorecard members and permissions
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-8">
            {/* Error Message at Top */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Scorecard Info Section */}
            <section className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Type:</span>
                  <span className="text-gray-900">
                    {scorecard.type === 'team' ? 'Team' : scorecard.type === 'role' ? 'Role' : scorecard.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Name:</span>
                  <span className="text-gray-900">{scorecard.name || 'Auto-generated'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Note: Scorecard names are automatically generated and cannot be edited.
                </p>
              </div>
            </section>

            {/* Team Members Section */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                Team Members
              </h3>

              {/* Info message for team scorecards */}
              {scorecard.type === 'team' && scorecard.team_id && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Auto-synced:</strong> Members are automatically synced from the {scorecard.name} team.
                    To add or remove members, manage them in the team settings.
                  </p>
                </div>
              )}

              {/* Add Member Card - Only show for non-team scorecards */}
              {scorecard.type !== 'team' && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Add Member
                  </label>
                  <div className="space-y-3">
                    <EmployeeCombobox
                      employees={employees}
                      value={selectedEmployeeId}
                      onValueChange={setSelectedEmployeeId}
                      placeholder="Select employee..."
                    />
                    <div className="flex gap-2">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as 'editor' | 'viewer')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        disabled={isPending}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={handleAddMember}
                        disabled={!selectedEmployeeId || isPending}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Members List */}
              <div className="space-y-3">
                {members.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No members yet</p>
                ) : (
                  members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 flex-shrink-0">
                          {member.profile.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-900 truncate">
                            {member.profile.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {member.profile.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as 'owner' | 'editor' | 'viewer')}
                          className="px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          disabled={
                            isPending ||
                            member.role === 'owner' ||
                            (scorecard.type === 'team' && Boolean(scorecard.team_id))
                          }
                        >
                          <option value="owner">Owner</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>

                        {/* Only show remove button for non-team scorecards and non-owner members */}
                        {member.role !== 'owner' && scorecard.type !== 'team' && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={isPending}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
