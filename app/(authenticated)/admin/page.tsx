import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/auth/permissions'
import { getSystemStats } from '@/lib/actions/admin'
import { Users, Briefcase, FileText, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function AdminPage() {
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

  // Get system statistics
  const { data: stats, error } = await getSystemStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage users, teams, and system settings
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats?.total_users || 0}
          subtitle={`${stats?.active_users || 0} active`}
          icon={<Users className="size-5" />}
          href="/admin/users"
        />
        <StatCard
          title="Teams"
          value={stats?.total_teams || 0}
          subtitle="Active teams"
          icon={<Briefcase className="size-5" />}
          href="/admin/teams"
        />
        <StatCard
          title="Scorecards"
          value={stats?.total_scorecards || 0}
          subtitle={`${stats?.active_scorecards || 0} active`}
          icon={<FileText className="size-5" />}
          href="/admin/scorecards"
        />
        <StatCard
          title="System Health"
          value="Healthy"
          subtitle="All systems operational"
          icon={<Activity className="size-5" />}
          href="/admin/system"
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ActionCard
            title="Manage Users"
            description="View and manage all system users"
            href="/admin/users"
          />
          <ActionCard
            title="Manage Teams"
            description="Oversee all teams and their members"
            href="/admin/teams"
          />
          <ActionCard
            title="System Settings"
            description="Configure system-wide settings"
            href="/admin/settings"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  href: string
}

function StatCard({ title, value, subtitle, icon, href }: StatCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-lg border bg-card p-6 hover:bg-accent transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </Link>
  )
}

interface ActionCardProps {
  title: string
  description: string
  href: string
}

function ActionCard({ title, description, href }: ActionCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
      <Link href={href}>
        <Button variant="outline" size="sm" className="mt-4">
          Go to {title}
        </Button>
      </Link>
    </div>
  )
}
