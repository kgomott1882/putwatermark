"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LoadingIndicator } from "../LoadingIndicator";
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
      <p className="text-center text-xs leading-6 text-battleship">
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
      setUiState("error");
      setMessage("Your session expired. Please log in and try again.");
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

    setMessage(
      "Payment processing — your credits will appear shortly. Refresh your account page if they have not updated within a minute.",
    );
  }

  return (
    <div className="paypal-checkout-host flex w-full flex-col gap-3">
      {uiState === "completed" ? (
        <>
          {message ? (
            <p className="text-center text-xs leading-6 text-battleship" role="status">
              {message}
              {updatedBalance !== null ? (
                <>
                  {" "}
                  New balance: {formatCreditBalance(updatedBalance)} credits.
                </>
              ) : null}
            </p>
          ) : null}

          <div className="flex flex-col gap-2.5">
            <Link
              className="inline-flex w-full items-center justify-center rounded-xl bg-signal px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-sm transition hover:brightness-110"
              href="/watermark"
            >
              Go to Watermark Tool
            </Link>
            <Link
              className="inline-flex w-full items-center justify-center rounded-xl border border-ink/15 bg-landing-light px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-ink transition hover:border-ink/25 hover:bg-white"
              href="/account"
            >
              View My Account
            </Link>
          </div>
        </>
      ) : uiState === "processing" ? (
        <>
          <LoadingIndicator label="Confirming your payment..." />
          {message ? (
            <p className="text-center text-xs leading-6 text-battleship" role="status">
              {message}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <PayPalScriptProvider
            options={{
              clientId: paypalClientId,
              currency: "USD",
              intent: "capture",
            }}
          >
            <PayPalButtons
              key={checkoutKey}
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
                setMessage(null);

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

                  await pollForUpdatedCredits(expectedCredits, startingBalance);
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
                uiState === "error" ? "text-signal" : "text-battleship"
              }`}
              role="status"
            >
              {message}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
