"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useEffect, useRef, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { fetchUserCreditBalance, formatCreditBalance } from "@/lib/creditBalance";
import { capturePurchaseOrder, createPurchaseOrder } from "@/lib/purchaseClient";
import type { PurchaseTierId } from "@/lib/purchasePricing";

export type CheckoutSelection =
  | {
      credits: number;
      kind: "custom";
      key: string;
    }
  | {
      kind: "tier";
      key: string;
      tierId: PurchaseTierId;
    };

type PricingPayPalCheckoutProps = {
  checkoutKey: string;
  paypalClientId: string;
  selection: CheckoutSelection;
};

type PaymentUiState = "idle" | "processing" | "completed" | "error";

const POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 2_000;

export function PricingPayPalCheckout({
  checkoutKey,
  paypalClientId,
  selection,
}: PricingPayPalCheckoutProps) {
  const selectionRef = useRef(selection);
  const pendingOrderRef = useRef<{ expectedCredits: number; orderId: string } | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [uiState, setUiState] = useState<PaymentUiState>("idle");
  const [updatedBalance, setUpdatedBalance] = useState<number | null>(null);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  if (!paypalClientId) {
    return (
      <p className="text-center text-xs leading-6 text-beige-dim">
        PayPal checkout is not configured on this environment yet.
      </p>
    );
  }

  async function pollForUpdatedCredits(expectedCredits: number, startingBalance: number) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, POLL_INTERVAL_MS);
      });

      const balance = await fetchUserCreditBalance(supabase, user.id);

      if (balance >= startingBalance + expectedCredits) {
        setUpdatedBalance(balance);
        setUiState("completed");
        setMessage(
          `Payment confirmed. ${formatCreditBalance(expectedCredits)} credits were added to your balance.`,
        );
        return;
      }
    }

    setUiState("idle");
    setMessage(
      "Payment processing — your credits will appear shortly. Refresh your account page if they have not updated within a minute.",
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <PayPalScriptProvider
        options={{
          clientId: paypalClientId,
          currency: "USD",
          intent: "capture",
        }}
      >
        <PayPalButtons
          key={checkoutKey}
          disabled={uiState === "processing"}
          style={{
            color: "gold",
            height: 45,
            label: "paypal",
            layout: "vertical",
            shape: "rect",
          }}
          createOrder={async () => {
            setMessage(null);
            setUpdatedBalance(null);
            setUiState("idle");
            pendingOrderRef.current = null;

            const currentSelection = selectionRef.current;
            const result =
              currentSelection.kind === "tier"
                ? await createPurchaseOrder({ tierId: currentSelection.tierId })
                : await createPurchaseOrder({ credits: currentSelection.credits });

            pendingOrderRef.current = {
              expectedCredits: result.credits,
              orderId: result.orderId,
            };

            return result.orderId;
          }}
          onApprove={async (data) => {
            const orderId = data.orderID ?? pendingOrderRef.current?.orderId;

            if (!orderId) {
              setUiState("error");
              setMessage("PayPal did not return an order ID. Please try again.");
              return;
            }

            setUiState("processing");
            setMessage(
              "Payment approved — capturing on our server. Your credits will appear once PayPal confirms the payment.",
            );

            try {
              const supabase = createClient();
              const {
                data: { user },
              } = await supabase.auth.getUser();

              if (!user) {
                throw new Error("Your session expired. Please log in and try again.");
              }

              const startingBalance = await fetchUserCreditBalance(supabase, user.id);
              const expectedCredits = pendingOrderRef.current?.expectedCredits ?? 0;

              await capturePurchaseOrder(orderId);

              setUiState("idle");
              setMessage(
                "Payment processing — your credits will appear shortly once PayPal confirms the capture.",
              );

              void pollForUpdatedCredits(expectedCredits, startingBalance);
            } catch (error) {
              setUiState("error");
              setMessage(
                error instanceof Error
                  ? error.message
                  : "Could not complete payment. Please try again.",
              );
            }
          }}
          onCancel={() => {
            pendingOrderRef.current = null;
            setUiState("idle");
            setMessage("Payment cancelled. You can try again whenever you are ready.");
          }}
          onError={() => {
            pendingOrderRef.current = null;
            setUiState("error");
            setMessage("PayPal ran into a problem. Please try again.");
          }}
        />
      </PayPalScriptProvider>

      {message ? (
        <p
          className={`text-center text-xs leading-6 ${
            uiState === "error" ? "text-signal" : "text-beige-dim"
          }`}
          role="status"
        >
          {message}
          {updatedBalance !== null ? (
            <>
              {" "}
              New balance: {formatCreditBalance(updatedBalance)} credits.
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
