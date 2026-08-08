import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchUserCreditBalance } from "./creditBalance";

export function formatProfileDisplayName(
  name: string | null | undefined,
  surname: string | null | undefined,
  email: string | null | undefined,
) {
  const trimmedName = name?.trim() ?? "";
  const trimmedSurname = surname?.trim() ?? "";
  const isPlaceholderName =
    trimmedName === "User" &&
    (trimmedSurname === "Member" || trimmedSurname === "");
  const fullName = [trimmedName, trimmedSurname].filter(Boolean).join(" ");

  if (fullName && !isPlaceholderName) {
    return fullName;
  }

  return email?.trim() ?? "";
}

export function getDisplayNameInitial(displayName: string) {
  return displayName.trim().charAt(0).toUpperCase() || "?";
}

export async function fetchUserProfileDisplayName(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("name, surname")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return formatProfileDisplayName(data?.name, data?.surname, email);
}

export async function fetchNavAccountData(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
) {
  const [creditBalance, userDisplayName] = await Promise.all([
    fetchUserCreditBalance(supabase, userId),
    fetchUserProfileDisplayName(supabase, userId, email),
  ]);

  return {
    creditBalance,
    userDisplayName,
  };
}
