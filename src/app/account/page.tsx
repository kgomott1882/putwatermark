import { redirect } from "next/navigation";
import { createClient } from "../../../utils/supabase/server";
import { LogoutButton } from "./LogoutButton";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, surname")
    .eq("id", user.id)
    .single();

  const name = profile?.name ?? user.email ?? "there";

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-paper px-6 py-16 text-ink sm:px-12 lg:px-20">
      <section className="w-full max-w-md rounded-[2rem] border border-mist bg-paper p-8 text-center shadow-2xl shadow-mist/60 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-steel">
          Account
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-ink">
          Welcome back, {name}
        </h1>
        <p className="mt-4 text-sm leading-6 text-steel">{user.email}</p>
        <p className="mt-8 rounded-2xl border border-mist bg-mist/60 px-4 py-3 text-sm font-medium text-ink">
          Credits: 0
        </p>
        <div className="mt-8 flex justify-center">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
