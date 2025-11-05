'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { type RoleWithDetails, reorderRoles } from '@/lib/actions/roles'
import { SortableRoleRow } from './sortable-role-row'
import { ViewRoleMembersDialog } from './view-role-members-dialog'

interface RolesTableProps {
  initialRoles: RoleWithDetails[]
  isAdmin: boolean
}

export function RolesTable({ initialRoles, isAdmin }: RolesTableProps) {
  const router = useRouter()
  const [roles, setRoles] = useState(initialRoles)
  const [isReordering, setIsReordering] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setRoles((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      return arrayMove(items, oldIndex, newIndex)
    })

    // Update display_order in database
    setIsReordering(true)
    try {
      const oldIndex = roles.findIndex((item) => item.id === active.id)
      const newIndex = roles.findIndex((item) => item.id === over.id)
      const reorderedRoles = arrayMove(roles, oldIndex, newIndex)

      // Create update payload with new display_order values
      const updates = reorderedRoles.map((role, index) => ({
        id: role.id,
        display_order: index + 1,
      }))

      const { error } = await reorderRoles(updates)

      if (error) {
        console.error('Failed to reorder roles:', error)
        // Revert optimistic update
        setRoles(initialRoles)
      } else {
        // Refresh to get updated data
        router.refresh()
      }
    } catch (error) {
      console.error('Error reordering roles:', error)
      // Revert optimistic update
      setRoles(initialRoles)
    } finally {
      setIsReordering(false)
    }
  }

  const adminRows = (
    <SortableContext
      items={roles.map((role) => role.id)}
      strategy={verticalListSortingStrategy}
    >
      {roles.map((role) => (
        <SortableRoleRow
          key={role.id}
          role={role}
          roles={roles}
          isAdmin={isAdmin}
        />
      ))}
    </SortableContext>
  )

  const viewerRows = roles.map((role) => (
    <tr
      key={role.id}
      className="border-b last:border-b-0 hover:bg-muted/20 transition-colors"
    >
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
    </tr>
  ))

  const tableMarkup = (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b">
              {isAdmin && <th className="w-10"></th>}
              <th className="text-left p-4 font-medium text-sm">Role Name</th>
              <th className="text-left p-4 font-medium text-sm">Description</th>
              <th className="text-left p-4 font-medium text-sm">
                Accountable To
              </th>
              <th className="text-left p-4 font-medium text-sm">People</th>
              {isAdmin && (
                <th className="text-right p-4 font-medium text-sm">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>{isAdmin ? adminRows : viewerRows}</tbody>
        </table>
      </div>
      {isReordering && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Saving order...</p>
        </div>
      )}
    </div>
  )

  if (!isAdmin) {
    return tableMarkup
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      {tableMarkup}
    </DndContext>
  )
}
