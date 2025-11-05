import { getUser } from "@/lib/auth/session"
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
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-6">
      <div className="flex-1" />
      <UserDropdown user={user} profile={profile} />
    </header>
  )
}
