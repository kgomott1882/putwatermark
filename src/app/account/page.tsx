import { redirect } from "next/navigation";
import { Button } from "../../../components/Button";
import {
  fetchUserCreditBalance,
  formatCreditBalance,
} from "../../lib/creditBalance";
import { createClient } from "../../../utils/supabase/server";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { LogoutButton } from "./LogoutButton";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: pendingDeletionRequest },
    creditBalance,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, surname")
      .eq("id", user.id)
      .single(),
    supabase
      .from("deletion_requests")
      .select("id, requested_at, sla_due_at, status")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle(),
    fetchUserCreditBalance(supabase, user.id),
  ]);

  const name = profile?.name ?? user.email ?? "there";

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-paper px-6 py-16 text-ink sm:px-12 lg:px-20">
      <section className="w-full max-w-md rounded-[2rem] border border-platinum bg-paper p-8 text-center shadow-2xl shadow-platinum/60 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-battleship">
          Account
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink">
          Welcome back, {name}
        </h1>
        <p className="mt-4 text-sm leading-6 text-battleship">{user.email}</p>
        <p className="mt-8 rounded-2xl border border-platinum bg-platinum/60 px-4 py-3 text-sm font-medium text-ink">
          Credits: {formatCreditBalance(creditBalance)}
        </p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button className="w-full justify-center px-6 py-3.5 text-sm" href="/watermark">
            Go to Watermark Tool
          </Button>
          <LogoutButton />
        </div>

        <DeleteAccountSection
          initialRequest={pendingDeletionRequest}
          userId={user.id}
        />
      </section>
    </main>
  );
}
