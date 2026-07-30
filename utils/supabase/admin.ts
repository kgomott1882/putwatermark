import { createClient } from "@supabase/supabase-js";

export const WATERMARK_TEMP_BUCKET = "watermark-temp";
export const ANONYMOUS_DRAFTS_BUCKET = "anonymous-drafts";
export const ANONYMOUS_DRAFT_EXPIRY_HOURS = 48;

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Server video export requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isSupabaseAdminConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function isServerVideoExportConfigured() {
  return isSupabaseAdminConfigured();
}
