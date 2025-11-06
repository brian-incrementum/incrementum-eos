import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { requireUser } from '@/lib/auth/session'
import { getRoleById, getRoles } from '@/lib/actions/roles'
import { isSystemAdmin } from '@/lib/auth/permissions'
import { Button } from '@/components/ui/button'
import { RoleDetailsHeader } from './role-details-header'
import { RoleHierarchySection } from './role-hierarchy-section'
import { RoleMembersList } from './role-members-list'

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireUser({ redirectTo: '/login' })

  // Check if user is admin
  const isAdmin = await isSystemAdmin(user.id)

  // Fetch the role details
  const { data: roleData, error } = await getRoleById(id)

  // Fetch all roles for the hierarchy section (to show child roles)
  const { data: allRoles } = await getRoles()

  if (error || !roleData) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error Loading Role
          </h2>
          <p className="text-red-700">{error || 'Role not found'}</p>
          <Link
            href="/roles"
            className="text-red-800 hover:text-red-900 underline mt-4 inline-block"
          >
            ← Back to Roles
          </Link>
        </div>
      </div>
    )
  }

  // Find child roles (roles that report to this role)
  const childRoles = allRoles?.filter(
    (role) => role.accountable_to_role_id === id
  ) || []

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/roles">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 size-4" />
            Back to Roles
          </Button>
        </Link>
      </div>

      {/* Role header with name, description, and stats */}
      <RoleDetailsHeader role={roleData} memberCount={roleData.members.length} />

      {/* Role hierarchy - parent and child roles */}
      <RoleHierarchySection
        parentRole={roleData.accountable_to_role}
        childRoles={childRoles}
      />

      {/* Members list */}
      <RoleMembersList
        members={roleData.members}
        roleName={roleData.name}
        isAdmin={isAdmin}
      />
    </div>
  )
}
