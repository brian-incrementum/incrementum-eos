import { Users, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import type { RoleWithMembers } from '@/lib/actions/roles'

interface RoleDetailsHeaderProps {
  role: RoleWithMembers
  memberCount: number
}

export function RoleDetailsHeader({ role, memberCount }: RoleDetailsHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-3xl">{role.name}</CardTitle>
        {role.description ? (
          <p className="text-muted-foreground mt-2">{role.description}</p>
        ) : (
          <p className="text-muted-foreground italic mt-2">No description</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{memberCount}</p>
              <p className="text-xs text-muted-foreground">
                {memberCount === 1 ? 'Member' : 'Members'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {formatDistanceToNow(new Date(role.created_at), { addSuffix: true })}
              </p>
              <p className="text-xs text-muted-foreground">Created</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
