import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { RoleWithMembers } from '@/lib/actions/roles'

interface RoleMembersListProps {
  members: RoleWithMembers['members']
  roleName: string
  isAdmin: boolean
}

export function RoleMembersList({
  members,
  roleName,
  isAdmin,
}: RoleMembersListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5" />
          Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="size-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No members assigned to this role yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/20 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.profile.avatar_url || ''} />
                  <AvatarFallback>
                    {member.profile.full_name
                      ?.split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">
                    {member.profile.full_name || member.profile.email}
                  </p>
                  {member.profile.full_name && member.profile.email && (
                    <p className="text-sm text-muted-foreground">
                      {member.profile.email}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
