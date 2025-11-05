import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/auth/permissions'
import { getAllUsers } from '@/lib/actions/admin'
import { UserAdminToggle } from './user-admin-toggle'
import { Badge } from '@/components/ui/badge'
import { Shield, Users } from 'lucide-react'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check system admin status
  const isAdmin = await isSystemAdmin(user.id)

  if (!isAdmin) {
    redirect('/dashboard')
  }

  // Get all users
  const { data: users, error } = await getAllUsers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all system users
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
        >
          Back to Admin
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {users && users.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Teams</th>
                  <th className="text-left p-4 font-medium">Scorecards</th>
                  <th className="text-left p-4 font-medium">Admin</th>
                  <th className="text-left p-4 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem.id} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Users className="size-5" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {userItem.profile?.full_name || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {userItem.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {userItem.employee ? (
                        <Badge
                          variant={
                            userItem.employee.status === 'active'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {userItem.employee.status}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No employee record</Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{userItem.team_count}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{userItem.scorecard_count}</span>
                    </td>
                    <td className="p-4">
                      <UserAdminToggle
                        userId={userItem.id}
                        isAdmin={userItem.profile?.is_system_admin || false}
                        isCurrentUser={userItem.id === user.id}
                      />
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {new Date(userItem.created_at).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Users className="mx-auto size-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No users found</h3>
          <p className="text-muted-foreground mt-2">
            There are no users in the system.
          </p>
        </div>
      )}

      {/* Summary Statistics */}
      {users && users.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Users</span>
            </div>
            <p className="text-2xl font-bold mt-2">{users.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">System Admins</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {users.filter((u) => u.profile?.is_system_admin).length}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">Active Employees</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {users.filter((u) => u.employee?.status === 'active').length}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
