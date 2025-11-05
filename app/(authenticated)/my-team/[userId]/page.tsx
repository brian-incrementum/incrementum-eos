import { requireUser } from "@/lib/auth/session"
import { isUserManager } from "@/lib/auth/permissions"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface PageProps {
  params: Promise<{ userId: string }>
}

export default async function DirectReportPage({ params }: PageProps) {
  const { user } = await requireUser({ redirectTo: "/login" })
  const { userId } = await params
  const supabase = await createClient()

  // Verify the current user is the manager of this user
  const isManager = await isUserManager(user.id, userId, supabase)

  if (!isManager) {
    notFound()
  }

  // Fetch the report's profile
  const { data: reportProfile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (profileError || !reportProfile) {
    notFound()
  }

  // Fetch the report's role scorecards
  const { data: scorecards, error: scorecardsError } = await supabase
    .from("scorecards")
    .select(`
      *,
      role:roles(id, name),
      metrics:metrics(count)
    `)
    .eq("owner_user_id", userId)
    .eq("type", "role")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  const initials = reportProfile.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U"

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/my-team">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="size-4 mr-2" />
          Back to My Team
        </Button>
      </Link>

      {/* Report Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              {reportProfile.avatar_url && (
                <AvatarImage
                  src={reportProfile.avatar_url}
                  alt={reportProfile.full_name || "User"}
                />
              )}
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-2xl">
                {reportProfile.full_name || "No name"}
              </CardTitle>
              <CardDescription className="text-base">
                {reportProfile.email}
              </CardDescription>
            </div>
            {reportProfile.is_active ? (
              <Badge variant="outline" className="border-green-600 text-green-600">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-400 text-gray-600">
                Inactive
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Role Scorecards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Role Scorecards</h2>
            <p className="text-sm text-muted-foreground mt-1">
              View performance metrics for each role
            </p>
          </div>
        </div>

        {scorecardsError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">
              Error loading scorecards: {scorecardsError.message}
            </p>
          </div>
        ) : scorecards && scorecards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scorecards.map((scorecard) => {
              const metricCount = Array.isArray(scorecard.metrics)
                ? scorecard.metrics.length
                : 0

              return (
                <Link key={scorecard.id} href={`/scorecards/${scorecard.id}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-accent h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base line-clamp-1">
                            {scorecard.name}
                          </CardTitle>
                          {scorecard.role && (
                            <CardDescription className="mt-1">
                              {scorecard.role.name}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant="secondary">
                          {scorecard.type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ClipboardList className="size-4" />
                        <span>
                          {metricCount} {metricCount === 1 ? "metric" : "metrics"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <ClipboardList className="mx-auto size-12 text-muted-foreground/50" />
              <h3 className="text-muted-foreground mt-4 text-lg font-medium">
                No role scorecards
              </h3>
              <p className="text-muted-foreground/70 mt-2 text-sm max-w-sm mx-auto">
                This team member doesn't have any active role scorecards yet.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
