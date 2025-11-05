import { getUser } from "@/lib/auth/session"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserDropdown } from "./user-dropdown"

export async function TopBar() {
  const { supabase, user } = await getUser()

  if (!user) {
    return null
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <header className="flex h-16 items-center gap-4 border-b px-6">
      <SidebarTrigger />
      <div className="flex-1" />
      <UserDropdown user={user} profile={profile} />
    </header>
  )
}
