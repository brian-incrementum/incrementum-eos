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
    <SidebarProvider>
      <AppSidebar isSystemAdmin={isAdmin} />
      <main className="flex min-h-screen w-full flex-col">
        <TopBar />
        <div className="flex-1 p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
