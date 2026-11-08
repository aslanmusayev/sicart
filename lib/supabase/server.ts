// Server-only Supabase client with the service-role key (bypasses RLS). Never import this from a client component.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

export function supabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  return url;
}

export function serviceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return key;
}

export function adminClient(): SupabaseClient {
  if (typeof window !== "undefined") throw new Error("adminClient() must only run on the server");
  admin ??= createClient(supabaseUrl(), serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
