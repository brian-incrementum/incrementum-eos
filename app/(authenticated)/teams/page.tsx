import { requireUser } from "@/lib/auth/session"
import { getUserTeams } from "@/lib/actions/teams"
import { TeamCard } from "./team-card"
import { CreateTeamButton } from "./create-team-button"
import { Users } from "lucide-react"

export default async function TeamsPage() {
  await requireUser({ redirectTo: "/login" })

  // Fetch user's teams
  const { data: teams, error } = await getUserTeams()

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error Loading Teams
          </h2>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground mt-2">
            Collaborate with your team on scorecards and metrics
          </p>
        </div>
        <CreateTeamButton />
      </div>

      {/* Teams Grid */}
      {teams && teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <Users className="mx-auto size-12 text-muted-foreground/50" />
            <h3 className="text-muted-foreground mt-4 text-lg font-medium">
              No teams yet
            </h3>
            <p className="text-muted-foreground/70 mt-2 text-sm">
              Get started by creating your first team
            </p>
            <div className="mt-6">
              <CreateTeamButton variant="default" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
