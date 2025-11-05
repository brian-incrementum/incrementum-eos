'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { type RoleWithDetails } from '@/lib/actions/roles'
import { EditRoleDialog } from './edit-role-dialog'
import { DeleteRoleDialog } from './delete-role-dialog'
import { ViewRoleMembersDialog } from './view-role-members-dialog'

interface SortableRoleRowProps {
  role: RoleWithDetails
  roles: RoleWithDetails[]
  isAdmin: boolean
}

export function SortableRoleRow({
  role,
  roles,
  isAdmin,
}: SortableRoleRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
    >
      {isAdmin && (
        <td className="p-4 w-10">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Drag to reorder"
          >
            <GripVertical className="size-5" />
          </button>
        </td>
      )}
      <td className="p-4">
        <p className="font-medium">{role.name}</p>
      </td>
      <td className="p-4">
        {role.description ? (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {role.description}
          </p>
        ) : (
          <span className="text-sm text-muted-foreground italic">
            No description
          </span>
        )}
      </td>
      <td className="p-4">
        {role.accountable_to_role ? (
          <span className="text-sm">{role.accountable_to_role.name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-4">
        <ViewRoleMembersDialog
          roleId={role.id}
          roleName={role.name}
          employeeCount={role.employee_count}
          isAdmin={isAdmin}
        />
      </td>
      {isAdmin && (
        <td className="p-4">
          <div className="flex items-center justify-end gap-1">
            <EditRoleDialog role={role} roles={roles} isAdmin={isAdmin} />
            <DeleteRoleDialog role={role} isAdmin={isAdmin} />
          </div>
        </td>
      )}
    </tr>
  )
}
