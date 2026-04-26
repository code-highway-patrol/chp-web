import { createClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();

const hasConfig = Boolean(url && key);

if (import.meta.env.PROD && !hasConfig) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set",
  );
}

const DEV_PLACEHOLDER_URL = "http://127.0.0.1:54321";
const DEV_PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

export const isSupabaseConfigured = hasConfig;

export const supabase = createClient(
  hasConfig ? url : DEV_PLACEHOLDER_URL,
  hasConfig ? key : DEV_PLACEHOLDER_ANON_KEY,
  {
    auth: {
      persistSession: hasConfig,
      autoRefreshToken: hasConfig,
      detectSessionInUrl: hasConfig,
    },
  },
);
