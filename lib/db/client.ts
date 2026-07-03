import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service-role key. Returns null when env
 * is not configured so Phase 1 can run (compute + validate) without a database —
 * persistence simply no-ops. Wire real env before relying on saved history.
 */
let cached: SupabaseClient | null | undefined;

export function getDb(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[db] Supabase env not set — persistence disabled (compute still works).",
      );
    }
    cached = null;
    return cached;
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return cached;
}

export function isDbConfigured(): boolean {
  return getDb() !== null;
}
