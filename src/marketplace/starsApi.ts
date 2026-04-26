import { supabase, isSupabaseConfigured } from "../auth/supabase";

// Best-effort persistence of a user's star to Supabase. Local UI is the source
// of truth for the immediate render; this is fire-and-forget so a network
// failure or signed-out state never blocks the toggle.
export async function recordStar(slug: string, starred: boolean): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;

  if (starred) {
    await supabase
      .from("statue_stars")
      .upsert({ user_id: userId, slug }, { onConflict: "user_id,slug" });
  } else {
    await supabase
      .from("statue_stars")
      .delete()
      .eq("user_id", userId)
      .eq("slug", slug);
  }
}
