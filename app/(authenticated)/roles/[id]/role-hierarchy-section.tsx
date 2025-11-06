import Link from 'next/link'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Role } from '@/lib/types/database.types'

interface RoleHierarchySectionProps {
  parentRole: Role | null
  childRoles: Role[]
}

export function RoleHierarchySection({
  parentRole,
  childRoles,
}: RoleHierarchySectionProps) {
  // Don't render if there's no hierarchy
  if (!parentRole && childRoles.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Hierarchy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Parent Role */}
        {parentRole && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowUp className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Accountable To
              </h3>
            </div>
            <Link href={`/roles/${parentRole.id}`}>
              <Button variant="outline" className="w-full justify-start">
                {parentRole.name}
              </Button>
            </Link>
          </div>
        )}

        {/* Child Roles */}
        {childRoles.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ArrowDown className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Direct Reports ({childRoles.length})
              </h3>
            </div>
            <div className="space-y-2">
              {childRoles.map((childRole) => (
                <Link key={childRole.id} href={`/roles/${childRole.id}`}>
                  <Button variant="outline" className="w-full justify-start">
                    {childRole.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
