import { createAdminClient } from "../../utils/supabase/admin";
import { capturePayPalOrder, PayPalClientError } from "./paypalClient";

export class PurchaseCaptureOrderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PurchaseCaptureOrderError";
    this.status = status;
  }
}

const PAYPAL_ORDER_ID_PATTERN = /^[A-Z0-9]+$/i;

export function sanitizePayPalOrderId(orderId: string) {
  const normalized = orderId.trim();

  if (!normalized || !PAYPAL_ORDER_ID_PATTERN.test(normalized)) {
    throw new PurchaseCaptureOrderError("Invalid orderId.");
  }

  return normalized;
}

export async function capturePurchaseOrderForUser({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}) {
  const paypalOrderId = sanitizePayPalOrderId(orderId);
  const supabase = createAdminClient();

  const { data: purchase, error } = await supabase
    .from("purchases")
    .select("id, status, user_id")
    .eq("processor", "paypal")
    .eq("processor_ref", paypalOrderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load purchase for capture", {
      error: error.message,
      orderId: paypalOrderId,
      userId,
    });

    throw new PurchaseCaptureOrderError("Could not verify purchase.", 503);
  }

  if (!purchase) {
    throw new PurchaseCaptureOrderError("Purchase not found.", 404);
  }

  if (purchase.status === "confirmed") {
    return {
      alreadyConfirmed: true,
      orderId: paypalOrderId,
      purchaseId: purchase.id as string,
      status: "confirmed" as const,
    };
  }

  if (purchase.status !== "pending") {
    throw new PurchaseCaptureOrderError(
      "This purchase can no longer be captured.",
      409,
    );
  }

  let captureResult;

  try {
    captureResult = await capturePayPalOrder(paypalOrderId);
  } catch (error) {
    if (error instanceof PayPalClientError) {
      throw new PurchaseCaptureOrderError(error.message, error.status);
    }

    throw error;
  }

  return {
    captureId: captureResult.captureId,
    captureStatus: captureResult.captureStatus,
    orderId: paypalOrderId,
    orderStatus: captureResult.orderStatus,
    purchaseId: purchase.id as string,
  };
}
