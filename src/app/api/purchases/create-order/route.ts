import { NextResponse } from "next/server";
import { createClient } from "../../../../../utils/supabase/server";
import { isSupabaseAdminConfigured } from "../../../../../utils/supabase/admin";
import { isPayPalConfigured, PayPalClientError } from "../../../../lib/paypalClient";
import {
  createPurchaseOrderFromRequest,
  PurchaseCreateOrderError,
} from "../../../../lib/purchaseCreateOrder";

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
        { error: "You must be logged in to purchase credits." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const result = await createPurchaseOrderFromRequest({
      body,
      userId: user.id,
    });

    return NextResponse.json({
      credits: result.quote.credits,
      label: result.quote.label,
      orderId: result.orderId,
      priceUSD: result.quote.priceUSD,
      purchaseId: result.purchaseId,
    });
  } catch (error) {
    if (error instanceof PurchaseCreateOrderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof PayPalClientError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Unexpected create-order failure", error);

    return NextResponse.json(
      { error: "Could not create purchase order." },
      { status: 500 },
    );
  }
}
