'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Users, Briefcase } from 'lucide-react'
import { type OrgChartNodeData } from './org-chart-utils'
import { AddChildRoleDialog } from './add-child-role-dialog'
import { EditRoleDialog } from './edit-role-dialog'
import { DeleteRoleDialog } from './delete-role-dialog'
import { ViewRoleMembersDialog } from './view-role-members-dialog'

export const OrgChartNode = memo(({ data }: NodeProps<OrgChartNodeData>) => {
  const { role, allRoles, isAdmin } = data

  return (
    <div className="relative">
      {/* Top handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />

      {/* Card */}
      <div className="bg-card border-2 border-border rounded-lg shadow-lg w-[280px] hover:shadow-xl transition-shadow">
        {/* Header with role name */}
        <div className="bg-primary/10 px-4 py-3 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Briefcase className="size-4 text-primary flex-shrink-0" />
              <h3 className="font-semibold text-sm leading-tight break-words">
                {role.name}
              </h3>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <AddChildRoleDialog
                  parentRole={role}
                  allRoles={allRoles}
                  isAdmin={isAdmin}
                />
                <EditRoleDialog role={role} roles={allRoles} isAdmin={isAdmin} />
                <DeleteRoleDialog role={role} isAdmin={isAdmin} />
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Description */}
          {role.description ? (
            <p className="text-xs text-muted-foreground line-clamp-3">
              {role.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No description
            </p>
          )}

          {/* People count */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" />
              <span>
                {role.employee_count}{' '}
                {role.employee_count === 1 ? 'person' : 'people'}
              </span>
            </div>
            <ViewRoleMembersDialog
              roleId={role.id}
              roleName={role.name}
              employeeCount={role.employee_count}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      </div>

      {/* Bottom handle for outgoing connections */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />
    </div>
  )
})

OrgChartNode.displayName = 'OrgChartNode'
