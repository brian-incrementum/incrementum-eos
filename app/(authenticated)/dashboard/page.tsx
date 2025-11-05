import { requireUser } from "@/lib/auth/session"

export default async function DashboardPage() {
  const { supabase, user } = await requireUser({ redirectTo: "/login" })

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My EOS</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {profile?.full_name || user.email}
        </p>
      </div>

      {/* Content will be added here */}
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <h3 className="text-muted-foreground text-lg font-medium">
            Your dashboard is ready
          </h3>
          <p className="text-muted-foreground/70 mt-2 text-sm">
            Content coming soon...
          </p>
        </div>
      </div>
    </div>
  )
}
