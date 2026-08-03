import { createAdminClient } from "../../utils/supabase/admin";
import { createPayPalCheckoutOrder } from "./paypalClient";
import {
  PurchasePricingError,
  resolvePurchaseSelection,
  type PurchaseSelectionInput,
  type ResolvedPurchaseQuote,
} from "./purchasePricing";

export class PurchaseCreateOrderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PurchaseCreateOrderError";
    this.status = status;
  }
}

type CreateOrderRequestBody = {
  credits?: unknown;
  priceUSD?: unknown;
  tierId?: unknown;
};

function rejectUnexpectedPricingFields(body: CreateOrderRequestBody) {
  if (body.priceUSD !== undefined) {
    throw new PurchaseCreateOrderError(
      "priceUSD is not accepted. Pricing is resolved on the server.",
    );
  }
}

export function parseCreateOrderRequestBody(body: unknown): PurchaseSelectionInput {
  if (!body || typeof body !== "object") {
    throw new PurchaseCreateOrderError("Invalid request body.");
  }

  const payload = body as CreateOrderRequestBody;

  rejectUnexpectedPricingFields(payload);

  const hasTierId = payload.tierId !== undefined && payload.tierId !== null;
  const hasCredits = payload.credits !== undefined && payload.credits !== null;

  if (hasTierId && hasCredits) {
    throw new PurchaseCreateOrderError("Provide either tierId or credits, not both.");
  }

  if (!hasTierId && !hasCredits) {
    throw new PurchaseCreateOrderError("Either tierId or credits is required.");
  }

  if (hasTierId) {
    if (typeof payload.tierId !== "string" || !payload.tierId.trim()) {
      throw new PurchaseCreateOrderError("tierId must be a non-empty string.");
    }

    return {
      kind: "tier",
      tierId: payload.tierId.trim().toLowerCase(),
    };
  }

  if (typeof payload.credits !== "number") {
    throw new PurchaseCreateOrderError("credits must be a number.");
  }

  return {
    credits: payload.credits,
    kind: "custom",
  };
}

export async function createPendingPurchaseOrder({
  quote,
  userId,
}: {
  quote: ResolvedPurchaseQuote;
  userId: string;
}) {
  const paypalOrderId = await createPayPalCheckoutOrder(quote);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("purchases")
    .insert({
      amount_usd: quote.priceUSD,
      credits_purchased: quote.credits,
      processor: "paypal",
      processor_ref: paypalOrderId,
      status: "pending",
      user_id: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to insert pending purchase after PayPal order creation", {
      error: error?.message,
      paypalOrderId,
      userId,
    });

    throw new PurchaseCreateOrderError(
      "Could not record your purchase. Please try again.",
      503,
    );
  }

  return {
    orderId: paypalOrderId,
    purchaseId: data.id as string,
    quote,
  };
}

export async function createPurchaseOrderFromRequest({
  body,
  userId,
}: {
  body: unknown;
  userId: string;
}) {
  let selection: PurchaseSelectionInput;

  try {
    selection = parseCreateOrderRequestBody(body);
  } catch (error) {
    if (error instanceof PurchasePricingError) {
      throw new PurchaseCreateOrderError(error.message, 400);
    }

    throw error;
  }

  let quote: ResolvedPurchaseQuote;

  try {
    quote = resolvePurchaseSelection(selection);
  } catch (error) {
    if (error instanceof PurchasePricingError) {
      throw new PurchaseCreateOrderError(error.message, 400);
    }

    throw error;
  }

  return createPendingPurchaseOrder({ quote, userId });
}
