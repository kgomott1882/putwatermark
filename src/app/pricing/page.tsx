import { createClient } from "../../../utils/supabase/server";
import { Footer } from "../../../components/Footer";
import { PricingSelector } from "./PricingSelector";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const paypalClientId = process.env.PAYPAL_CLIENT_ID?.trim() ?? "";

  return (
    <main className="landing-theme">
      <PricingSelector
        isLoggedIn={Boolean(user)}
        paypalClientId={paypalClientId}
      />
      <Footer />
    </main>
  );
}
