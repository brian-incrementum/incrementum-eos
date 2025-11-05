import Link from "next/link"
import { Users, ClipboardList } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Tables } from "@/lib/types/database.types"

type TeamMember = Tables<"team_members"> & {
  profile: Tables<"profiles">
}

interface TeamCardProps {
  team: Tables<"teams"> & {
    members?: TeamMember[]
    member_count?: number
    scorecard_count?: number
  }
  isAdminView?: boolean
}

export function TeamCard({ team, isAdminView = false }: TeamCardProps) {
  // Get current user's role in the team
  const getUserRole = () => {
    // This would need current user context
    // For now, return first member's role as placeholder
    return team.members?.[0]?.role || "member"
  }

  const role = getUserRole()
  const memberCount = team.member_count ?? team.members?.length ?? 0
  const scorecardCount = team.scorecard_count ?? 0

  return (
    <Link href={`/teams/${team.id}`}>
      <Card className="cursor-pointer transition-colors hover:bg-accent">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="line-clamp-1">{team.name}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1.5">
                {team.description || "No description"}
              </CardDescription>
            </div>
            {isAdminView ? (
              <Badge variant="outline" className="ml-2 border-blue-600 text-blue-600">
                Admin View
              </Badge>
            ) : (
              <Badge variant={role === "owner" ? "default" : "secondary"} className="ml-2">
                {role}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Members Preview */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </span>
              </div>
              {team.members && team.members.length > 0 && (
                <div className="flex -space-x-2">
                  {team.members.slice(0, 3).map((member) => {
                    const initials = member.profile.full_name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "U"

                    return (
                      <Avatar key={member.id} className="size-8 border-2 border-background">
                        {member.profile.avatar_url && (
                          <AvatarImage src={member.profile.avatar_url} alt={member.profile.full_name || "User"} />
                        )}
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                    )
                  })}
                  {memberCount > 3 && (
                    <div className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                      +{memberCount - 3}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Scorecards Count */}
            <div className="flex items-center gap-2 border-t pt-4">
              <ClipboardList className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {scorecardCount} {scorecardCount === 1 ? "scorecard" : "scorecards"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
