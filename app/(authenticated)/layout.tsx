import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { TopBar } from "@/components/layout/top-bar"
import { requireUser } from "@/lib/auth/session"
import { isSystemAdmin } from "@/lib/auth/permissions"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = await requireUser({ redirectTo: "/login" })

  // Check if user is system admin
  const isAdmin = user ? await isSystemAdmin(user.id) : false

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="grid min-h-screen w-full md:grid-cols-[256px_1fr]">
        <AppSidebar isSystemAdmin={isAdmin} />
        <div className="flex min-h-screen flex-col">
          <TopBar />
          <div className="flex-1 min-h-0 p-6 overflow-x-hidden">{children}</div>
        </div>
      </div>
    </SidebarProvider>
  )
}
