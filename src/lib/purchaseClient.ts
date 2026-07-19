type CreatePurchaseOrderBody =
  | {
      credits: number;
    }
  | {
      tierId: string;
    };

type CreatePurchaseOrderResponse = {
  credits: number;
  label: string;
  orderId: string;
  priceUSD: number;
  purchaseId: string;
};

type CapturePurchaseOrderResponse = {
  alreadyConfirmed?: boolean;
  captureId?: string | null;
  captureStatus?: string | null;
  orderId: string;
  orderStatus?: string | null;
  purchaseId: string;
  status?: "confirmed";
};

async function readJsonError(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };

    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  } catch {
    // Ignore malformed error bodies.
  }

  return fallback;
}

export async function createPurchaseOrder(body: CreatePurchaseOrderBody) {
  const response = await fetch("/api/purchases/create-order", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      await readJsonError(response, "Could not start checkout. Please try again."),
    );
  }

  return (await response.json()) as CreatePurchaseOrderResponse;
}

export async function capturePurchaseOrder(orderId: string) {
  const response = await fetch("/api/purchases/capture-order", {
    body: JSON.stringify({ orderId }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      await readJsonError(response, "Could not complete payment capture. Please try again."),
    );
  }

  return (await response.json()) as CapturePurchaseOrderResponse;
}
