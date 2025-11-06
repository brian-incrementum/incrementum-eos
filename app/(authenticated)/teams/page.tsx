import { requireUser } from "@/lib/auth/session"
import { getUserTeams, getAllTeams } from "@/lib/actions/teams"
import { isSystemAdmin } from "@/lib/auth/permissions"
import { TeamCard } from "./team-card"
import { CreateTeamButton } from "./create-team-button"
import { Users, Shield } from "lucide-react"

// Enable ISR: Cache this page for 60 seconds for faster subsequent loads
export const revalidate = 60

export default async function TeamsPage() {
  const { user } = await requireUser({ redirectTo: "/login" })

  // Check if user is system admin
  const isAdmin = await isSystemAdmin(user.id)

  // Fetch user's teams
  const { data: userTeams, error: userTeamsError } = await getUserTeams()

  // Fetch all teams if admin
  const { data: allTeams, error: allTeamsError } = isAdmin
    ? await getAllTeams()
    : { data: null, error: null }

  if (userTeamsError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error Loading Teams
          </h2>
          <p className="text-red-700">{userTeamsError}</p>
        </div>
      </div>
    )
  }

  // Filter out teams the user is already part of from the all teams list
  const userTeamIds = new Set(userTeams?.map(t => t.id) || [])
  const otherTeams = allTeams?.filter(team => !userTeamIds.has(team.id)) || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-2">
            Collaborate with your team on scorecards and metrics
          </p>
        </div>
        {isAdmin && <CreateTeamButton isAdmin={isAdmin} />}
      </div>

      {/* Your Teams Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Teams</h2>
        {userTeams && userTeams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <Users className="mx-auto size-12 text-muted-foreground/50" />
              <h3 className="text-muted-foreground mt-4 text-lg font-medium">
                No teams yet
              </h3>
              <p className="text-muted-foreground/70 mt-2 text-sm">
                {isAdmin
                  ? "Get started by creating your first team"
                  : "You haven't been added to any teams yet"}
              </p>
              {isAdmin && (
                <div className="mt-6">
                  <CreateTeamButton variant="default" isAdmin={isAdmin} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* All Teams Section (Admin Only) */}
      {isAdmin && otherTeams.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-blue-600" />
            <h2 className="text-xl font-semibold">All Teams (Admin)</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            As a system administrator, you can view and manage all teams in the organization.
          </p>
          {allTeamsError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{allTeamsError}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {otherTeams.map((team) => (
                <TeamCard key={team.id} team={team} isAdminView />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
