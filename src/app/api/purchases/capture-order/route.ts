import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { isSupabaseAdminConfigured } from "../../../../../utils/supabase/admin";
import { isPayPalConfigured, PayPalClientError } from "../../../../lib/paypalClient";
import {
  capturePurchaseOrderForUser,
  PurchaseCaptureOrderError,
} from "../../../../lib/purchaseCaptureOrder";

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

  if (!isPayPalConfigured()) {
    return NextResponse.json(
      {
        error:
          "PayPal checkout is not configured. Set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, and PAYPAL_MODE.",
      },
      { status: 503 },
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to capture a purchase." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as { orderId?: unknown };

    if (typeof body.orderId !== "string" || !body.orderId.trim()) {
      return NextResponse.json({ error: "orderId is required." }, { status: 400 });
    }

    const result = await capturePurchaseOrderForUser({
      orderId: body.orderId,
      userId: user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PurchaseCaptureOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof PayPalClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unexpected capture-order failure", error);

    return NextResponse.json(
      { error: "Could not capture purchase order." },
      { status: 500 },
    );
  }
}
