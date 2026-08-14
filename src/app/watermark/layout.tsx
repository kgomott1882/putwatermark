import { PayPalClientIdProvider } from "../../../components/pricing/PayPalClientIdProvider";

export default function WatermarkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const paypalClientId = process.env.PAYPAL_CLIENT_ID?.trim() ?? "";

  return (
    <PayPalClientIdProvider clientId={paypalClientId}>
      {children}
    </PayPalClientIdProvider>
  );
}
