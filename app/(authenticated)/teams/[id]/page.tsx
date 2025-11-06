import Link from "next/link"
import { requireUser } from "@/lib/auth/session"
import { getTeamDetails } from "@/lib/actions/teams"
import { getUserTeamRole, isSystemAdmin } from "@/lib/auth/permissions"
import { TeamHeader } from "./team-header"
import { TeamMembers } from "./team-members"
import { TeamScorecards } from "./team-scorecards"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { user } = await requireUser({ redirectTo: "/login" })

  // Fetch all data in parallel for faster page load
  const [{ data: team, error }, userRole, isAdmin] = await Promise.all([
    getTeamDetails(id),
    getUserTeamRole(id, user.id),
    isSystemAdmin(user.id),
  ])

  if (error || !team) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/teams">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Team Not Found</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error Loading Team
          </h2>
          <p className="text-red-700">{error || "Team not found"}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teams">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <TeamHeader team={team} userRole={userRole} userId={user.id} />
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Team Members */}
        <div className="lg:col-span-1">
          <TeamMembers
            teamId={team.id}
            members={team.members}
            userRole={userRole}
            currentUserId={user.id}
            isAdmin={isAdmin}
          />
        </div>

        {/* Right Column - Team Scorecards */}
        <div className="lg:col-span-2">
          <TeamScorecards
            teamId={team.id}
            userRole={userRole}
            scorecards={team.scorecards}
          />
        </div>
      </div>
    </div>
  )
}
