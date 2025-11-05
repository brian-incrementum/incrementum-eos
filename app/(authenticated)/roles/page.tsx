import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Briefcase } from 'lucide-react'
import { getRoles } from '@/lib/actions/roles'
import { isSystemAdmin } from '@/lib/auth/permissions'
import { CreateRoleDialog } from './create-role-dialog'
import { RolesTable } from './roles-table'
import { OrgChartView } from './org-chart-view'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function RolesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is system admin
  const isAdmin = await isSystemAdmin(user.id)

  // Fetch roles
  const { data: roles, error } = await getRoles()

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-red-600">Error loading roles: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Roles</h1>
          <p className="text-muted-foreground">
            Manage organizational roles and accountability structure
          </p>
        </div>
        <CreateRoleDialog roles={roles || []} isAdmin={isAdmin} />
      </div>

      {/* Empty State */}
      {!roles || roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="rounded-full bg-muted p-6">
            <Briefcase className="size-12 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">No roles yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? 'Create your first organizational role to get started'
                : 'No roles have been created yet'}
            </p>
          </div>
          {isAdmin && <CreateRoleDialog roles={[]} isAdmin={isAdmin} />}
        </div>
      ) : (
        <>
          {/* Tabs for Table and Chart Views */}
          <Tabs defaultValue="table" className="w-full">
            <TabsList>
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="chart">Chart View</TabsTrigger>
            </TabsList>
            <TabsContent value="table" className="mt-6">
              <RolesTable initialRoles={roles} isAdmin={isAdmin} />
            </TabsContent>
            <TabsContent value="chart" className="mt-6">
              <OrgChartView roles={roles} isAdmin={isAdmin} />
            </TabsContent>
          </Tabs>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Roles</p>
              <p className="text-2xl font-bold mt-1">{roles.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Assignments</p>
              <p className="text-2xl font-bold mt-1">
                {roles.reduce((sum, role) => sum + role.employee_count, 0)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Roles with People</p>
              <p className="text-2xl font-bold mt-1">
                {roles.filter((role) => role.employee_count > 0).length}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
