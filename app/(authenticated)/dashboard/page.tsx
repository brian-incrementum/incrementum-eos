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

      {/* Our Values Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Our Values
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                Team-first
              </h4>
              <p className="text-sm text-gray-700">
                Happy team, happy customers - build trust
              </p>
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                Ability to add value
              </h4>
              <p className="text-sm text-gray-700">
                Execute with excellence - ownership - get things done - self-driven - committed - no excuses - going extra mile - being thoughtful - above and beyond
              </p>
            </div>
            <div>
              <h4 className="text-base font-semibold text-gray-900 mb-2">
                Growth-oriented
              </h4>
              <p className="text-sm text-gray-700">
                Continuous self-improvement - curiosity - asking questions for improvement
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
