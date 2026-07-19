import { NextResponse } from "next/server";
import {
  NewsletterSubscribeError,
  subscribeToNewsletter,
} from "../../../../lib/newsletterSubscribe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      source?: string;
    };

    const result = await subscribeToNewsletter({
      email: body.email ?? "",
      name: body.name,
      source: body.source,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NewsletterSubscribeError) {
      return NextResponse.json({ error: error.message, ok: false }, { status: error.status });
    }

    return NextResponse.json(
      { error: "Could not save your subscription. Please try again.", ok: false },
      { status: 500 },
    );
  }
}
