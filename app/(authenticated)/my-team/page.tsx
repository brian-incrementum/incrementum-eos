import { requireUser } from "@/lib/auth/session"
import { getDirectReports } from "@/lib/actions/managers"
import { Users, TrendingUp } from "lucide-react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default async function MyTeamPage() {
  const { user } = await requireUser({ redirectTo: "/login" })

  // Fetch direct reports
  const reports = await getDirectReports(user.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Team</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your direct reports and their performance
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Direct Reports</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Team members reporting to you
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Direct Reports List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Direct Reports</h2>

        {reports.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => {
              const initials = report.full_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase() || "U"

              return (
                <Card key={report.id} className="hover:bg-accent transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="size-12">
                        {report.avatar_url && (
                          <AvatarImage
                            src={report.avatar_url}
                            alt={report.full_name || "User"}
                          />
                        )}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {report.full_name || "No name"}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {report.email}
                        </CardDescription>
                      </div>
                      {report.is_active ? (
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
                  <CardContent>
                    <div className="flex gap-2">
                      <Link href={`/my-team/${report.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <TrendingUp className="size-4 mr-2" />
                          View Scorecards
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <Users className="mx-auto size-12 text-muted-foreground/50" />
              <h3 className="text-muted-foreground mt-4 text-lg font-medium">
                No direct reports
              </h3>
              <p className="text-muted-foreground/70 mt-2 text-sm max-w-sm mx-auto">
                You don't have any direct reports assigned to you. If you believe this is incorrect,
                please contact your system administrator.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
