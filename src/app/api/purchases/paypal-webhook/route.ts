import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured } from "../../../../../utils/supabase/admin";
import { isPayPalWebhookConfigured } from "../../../../lib/paypalClient";
import {
  processPayPalWebhookEvent,
  PurchaseWebhookError,
  verifyIncomingPayPalWebhook,
} from "../../../../lib/purchaseWebhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Purchases are not configured. Set SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 },
    );
  }

  if (!isPayPalWebhookConfigured()) {
    return NextResponse.json(
      {
        error:
          "PayPal webhooks are not configured. Set PAYPAL_WEBHOOK_ID.",
      },
      { status: 503 },
    );
  }

  try {
    const rawBody = await request.text();
    const webhookEvent = await verifyIncomingPayPalWebhook({
      headers: request.headers,
      rawBody,
    });
    const result = await processPayPalWebhookEvent(webhookEvent);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof PurchaseWebhookError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unexpected PayPal webhook failure", error);

    return NextResponse.json(
      { error: "Could not process PayPal webhook." },
      { status: 500 },
    );
  }
}
