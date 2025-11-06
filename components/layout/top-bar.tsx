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

  const safeProfile = profile
    ? {
        full_name: profile.full_name ?? undefined,
        avatar_url: profile.avatar_url ?? undefined,
        is_system_admin: profile.is_system_admin ?? undefined,
      }
    : null

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-6">
      <div className="flex-1" />
      <UserDropdown user={user} profile={safeProfile} />
    </header>
  )
}
