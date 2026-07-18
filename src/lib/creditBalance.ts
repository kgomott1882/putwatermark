import type { SupabaseClient } from "@supabase/supabase-js";

/** User-facing credit balance — always from public.credit_balances. */
export async function fetchUserCreditBalance(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.balance ?? 0;
}

export function formatCreditBalance(balance: number) {
  return balance.toLocaleString("en-US");
}
