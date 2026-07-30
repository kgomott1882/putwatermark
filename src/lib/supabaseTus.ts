import { WATERMARK_TEMP_BUCKET } from "../../utils/supabase/admin";

export { WATERMARK_TEMP_BUCKET };

export function getSupabaseProjectRef(supabaseUrl: string) {
  return new URL(supabaseUrl).hostname.split(".")[0] ?? "";
}

/** Signed upload tokens from createSignedUploadUrl require the /sign TUS path. */
export function getSupabaseSignedTusEndpoint(supabaseUrl: string) {
  const projectRef = getSupabaseProjectRef(supabaseUrl);

  if (!projectRef) {
    throw new Error("Could not derive Supabase storage hostname from project URL.");
  }

  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable/sign`;
}

/** @deprecated Use getSupabaseSignedTusEndpoint for createSignedUploadUrl tokens. */
export function getSupabaseTusEndpoint(supabaseUrl: string) {
  return getSupabaseSignedTusEndpoint(supabaseUrl);
}
