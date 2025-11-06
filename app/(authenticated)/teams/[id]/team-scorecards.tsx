import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Plus, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TEAM_ROLES, type TeamRole } from "@/lib/auth/constants"

interface TeamScorecardsProps {
  teamId: string
  userRole: TeamRole | null
}

export async function TeamScorecards({ teamId, userRole }: TeamScorecardsProps) {
  const supabase = await createClient()

  // Fetch team scorecards
  const { data: scorecards } = await supabase
    .from("scorecards")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const canCreate = userRole === TEAM_ROLES.OWNER

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Scorecards</CardTitle>
            <CardDescription>
              {scorecards?.length || 0} active scorecards
            </CardDescription>
          </div>
          {canCreate && (
            <Button size="sm" asChild>
              <Link href={`/scorecards?team_id=${teamId}&create=true`}>
                <Plus className="mr-2 size-4" />
                Create Scorecard
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {scorecards && scorecards.length > 0 ? (
          <div className="space-y-3">
            {scorecards.map((scorecard) => (
              <Link
                key={scorecard.id}
                href={`/scorecards/${scorecard.id}`}
                className="block"
              >
                <div className="rounded-lg border p-4 transition-colors hover:bg-accent">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <ClipboardList className="size-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{scorecard.name}</h4>
                        <p className="text-muted-foreground text-sm">
                          Created{" "}
                          {new Date(scorecard.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{scorecard.type}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList className="size-12 text-muted-foreground/50" />
            <h3 className="text-muted-foreground mt-4 font-medium">
              No scorecards yet
            </h3>
            <p className="text-muted-foreground/70 mt-2 text-sm max-w-sm">
              {canCreate
                ? "Create your first team scorecard to start tracking metrics together"
                : "Team admins can create scorecards for this team"}
            </p>
            {canCreate && (
              <Button className="mt-4" size="sm" asChild>
                <Link href={`/scorecards?team_id=${teamId}&create=true`}>
                  <Plus className="mr-2 size-4" />
                  Create Scorecard
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
