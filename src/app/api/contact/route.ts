import { NextResponse } from "next/server";
import {
  ContactFormError,
  sendContactFormEmail,
  validateContactFormInput,
} from "../../../lib/contactForm";
import {
  checkContactRateLimit,
  getRequestClientKey,
  recordContactSubmission,
} from "../../../lib/contactRateLimit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const clientKey = getRequestClientKey(request);
    const rateLimit = checkContactRateLimit(clientKey);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Please wait ${rateLimit.retryAfterSeconds} seconds before sending another message.`,
          ok: false,
        },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      email?: string;
      message?: string;
      name?: string;
      topic?: string;
    };

    const input = validateContactFormInput({
      email: body.email ?? "",
      message: body.message ?? "",
      name: body.name ?? "",
      topic: body.topic ?? "",
    });

    const result = await sendContactFormEmail(input);
    recordContactSubmission(clientKey);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ContactFormError) {
      return NextResponse.json(
        { error: error.message, ok: false },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Could not send your message. Please try again.", ok: false },
      { status: 500 },
    );
  }
}
