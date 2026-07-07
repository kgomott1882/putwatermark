import { createClient } from "../../../utils/supabase/server";
import { PricingSelector } from "./PricingSelector";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-paper px-6 py-16 text-ink sm:px-12 lg:px-20">
      <PricingSelector isLoggedIn={Boolean(user)} />
    </main>
  );
}
