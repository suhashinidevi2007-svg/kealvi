import { createClient } from "@supabase/supabase-js";

// Keep configuration checks out of module evaluation so builds can run without
// a local database configuration.
export function getSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or their NEXT_PUBLIC equivalents."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}
