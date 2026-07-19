import { createAdminClient } from "../../utils/supabase/admin";
import {
  extractPayPalOrderIdFromWebhookEvent,
  parsePayPalWebhookEvent,
  verifyPayPalWebhookSignature,
  type PayPalWebhookEvent,
} from "./paypalClient";

export const PAYPAL_CAPTURE_COMPLETED_EVENT = "PAYMENT.CAPTURE.COMPLETED";
export const PAYPAL_CAPTURE_DENIED_EVENT = "PAYMENT.CAPTURE.DENIED";

type ConfirmPurchaseResult = {
  already_confirmed?: boolean;
  credits_granted?: number;
  error_code?: string;
  purchase_id?: string;
  status?: string;
  success: boolean;
};

type FailPurchaseResult = {
  already_confirmed?: boolean;
  already_failed?: boolean;
  error_code?: string;
  purchase_id?: string;
  status?: string;
  success: boolean;
};

export class PurchaseWebhookError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PurchaseWebhookError";
    this.status = status;
  }
}

export async function verifyIncomingPayPalWebhook({
  headers,
  rawBody,
}: {
  headers: Headers;
  rawBody: string;
}) {
  let webhookEvent: PayPalWebhookEvent;

  try {
    webhookEvent = parsePayPalWebhookEvent(rawBody);
  } catch {
    throw new PurchaseWebhookError("Invalid webhook payload.", 400);
  }

  const verified = await verifyPayPalWebhookSignature({
    headers,
    webhookEvent,
  });

  if (!verified) {
    throw new PurchaseWebhookError("Webhook signature verification failed.", 401);
  }

  return webhookEvent;
}

async function confirmPurchaseFromWebhook(orderId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("confirm_purchase_from_webhook", {
    p_processor: "paypal",
    p_processor_ref: orderId,
  });

  if (error) {
    console.error("confirm_purchase_from_webhook RPC failed", {
      error: error.message,
      orderId,
    });

    throw new PurchaseWebhookError("Could not confirm purchase.", 500);
  }

  return data as ConfirmPurchaseResult | null;
}

async function failPurchaseFromWebhook(orderId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("fail_purchase_from_webhook", {
    p_processor: "paypal",
    p_processor_ref: orderId,
  });

  if (error) {
    console.error("fail_purchase_from_webhook RPC failed", {
      error: error.message,
      orderId,
    });

    throw new PurchaseWebhookError("Could not update failed purchase.", 500);
  }

  return data as FailPurchaseResult | null;
}

export async function processPayPalWebhookEvent(webhookEvent: PayPalWebhookEvent) {
  const eventType = webhookEvent.event_type;

  if (
    eventType !== PAYPAL_CAPTURE_COMPLETED_EVENT &&
    eventType !== PAYPAL_CAPTURE_DENIED_EVENT
  ) {
    return {
      handled: false,
      eventType,
    };
  }

  const orderId = extractPayPalOrderIdFromWebhookEvent(webhookEvent);

  if (!orderId) {
    console.error("PayPal webhook missing related order id", { eventType });

    return {
      eventType,
      handled: true,
      ignored: true,
      reason: "missing_order_id",
    };
  }

  if (eventType === PAYPAL_CAPTURE_DENIED_EVENT) {
    const result = await failPurchaseFromWebhook(orderId);

    if (result?.error_code === "purchase_not_found") {
      console.warn("PayPal capture denied for unknown purchase", { orderId });

      return {
        eventType,
        handled: true,
        ignored: true,
        orderId,
        reason: "purchase_not_found",
      };
    }

    if (!result?.success) {
      console.error("Failed to mark purchase as failed", {
        orderId,
        result,
      });

      throw new PurchaseWebhookError("Could not mark purchase as failed.", 500);
    }

    return {
      alreadyConfirmed: Boolean(result.already_confirmed),
      alreadyFailed: Boolean(result.already_failed),
      eventType,
      handled: true,
      orderId,
      purchaseId: result.purchase_id,
      status: "failed",
    };
  }

  const result = await confirmPurchaseFromWebhook(orderId);

  if (result?.error_code === "purchase_not_found") {
    console.warn("PayPal capture completed for unknown purchase", { orderId });

    return {
      eventType,
      handled: true,
      ignored: true,
      orderId,
      reason: "purchase_not_found",
    };
  }

  if (!result?.success) {
    console.error("Purchase confirmation failed", {
      orderId,
      result,
    });

    throw new PurchaseWebhookError("Could not confirm purchase.", 500);
  }

  return {
    alreadyConfirmed: Boolean(result.already_confirmed),
    creditsGranted: result.credits_granted,
    eventType,
    handled: true,
    orderId,
    purchaseId: result.purchase_id,
    status: "confirmed",
  };
}
