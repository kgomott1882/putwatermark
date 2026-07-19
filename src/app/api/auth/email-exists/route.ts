import { NextResponse } from "next/server";
import { createAdminClient, isSupabaseAdminConfigured } from "../../../../../utils/supabase/admin";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailStatus = {
  confirmed: boolean;
  exists: boolean;
};

function parseEmailStatus(value: unknown): EmailStatus {
  if (typeof value !== "object" || value === null) {
    return { confirmed: false, exists: false };
  }

  const record = value as Record<string, unknown>;

  return {
    confirmed: Boolean(record.confirmed),
    exists: Boolean(record.exists),
  };
}

export async function POST(request: Request) {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json(
      { confirmed: false, error: "Signup check is not configured.", exists: false },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";

    if (!email || !emailPattern.test(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("check_user_email_status", {
      check_email: email,
    });

    if (error) {
      return NextResponse.json(
        { confirmed: false, error: "Could not check email availability." },
        { status: 503 },
      );
    }

    const status = parseEmailStatus(data);

    return NextResponse.json({
      confirmed: status.confirmed,
      exists: status.exists,
    });
  } catch {
    return NextResponse.json(
      { confirmed: false, error: "Could not check email availability." },
      { status: 500 },
    );
  }
}
