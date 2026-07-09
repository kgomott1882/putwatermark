import { createClient } from "../../../utils/supabase/server";
import { Footer } from "../../../components/Footer";
import { PricingSelector } from "./PricingSelector";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="landing-theme">
      <PricingSelector isLoggedIn={Boolean(user)} />
      <Footer />
    </main>
  );
}
