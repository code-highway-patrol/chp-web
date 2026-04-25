import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export type AuthedUser = {
  id: string;
  email: string | undefined;
};

export async function requireUser(
  authHeader: string | undefined
): Promise<AuthedUser | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email };
}

export const optionalUser = requireUser;
