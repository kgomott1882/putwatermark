import type { ResolvedPurchaseQuote } from "./purchasePricing";

export class PayPalClientError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "PayPalClientError";
    this.status = status;
  }
}

type PayPalMode = "live" | "sandbox";

type PayPalAccessTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

type PayPalCreateOrderResponse = {
  id?: string;
  status?: string;
};

export type PayPalWebhookEvent = {
  event_type?: string;
  resource?: {
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
};

type PayPalVerifyWebhookResponse = {
  verification_status?: string;
};

type PayPalCaptureOrderResponse = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
      }>;
    };
  }>;
};

type CachedPayPalAccessToken = {
  accessToken: string;
  expiresAtMs: number;
};

const PAYPAL_TOKEN_REFRESH_BUFFER_MS = 60_000;

let cachedAccessToken: CachedPayPalAccessToken | null = null;
let cachedAccessTokenMode: PayPalMode | null = null;

function getPayPalMode(): PayPalMode {
  const mode = process.env.PAYPAL_MODE?.trim().toLowerCase();

  if (mode === "sandbox" || mode === "live") {
    return mode;
  }

  throw new PayPalClientError(
    "PayPal is not configured. Set PAYPAL_MODE to sandbox or live.",
    503,
  );
}

export function isPayPalConfigured() {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      (process.env.PAYPAL_MODE?.trim().toLowerCase() === "sandbox" ||
        process.env.PAYPAL_MODE?.trim().toLowerCase() === "live"),
  );
}

export function isPayPalWebhookConfigured() {
  return isPayPalConfigured() && Boolean(process.env.PAYPAL_WEBHOOK_ID?.trim());
}

function getPayPalWebhookId() {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();

  if (!webhookId) {
    throw new PayPalClientError(
      "PayPal webhooks are not configured. Set PAYPAL_WEBHOOK_ID.",
      503,
    );
  }

  return webhookId;
}

function getPayPalApiBaseUrl(mode: PayPalMode) {
  return mode === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new PayPalClientError(
      "PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
      503,
    );
  }

  return { clientId, clientSecret };
}

function formatPayPalUsdAmount(priceUSD: number) {
  return priceUSD.toFixed(2);
}

function buildPurchaseDescription(quote: ResolvedPurchaseQuote) {
  const creditsLabel = quote.credits.toLocaleString("en-US");

  return `PutWatermark ${quote.label}, ${creditsLabel} credits`;
}

async function readPayPalErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as {
      message?: string;
      error_description?: string;
      details?: Array<{ issue?: string; description?: string }>;
    };

    return (
      payload.details?.[0]?.description ??
      payload.details?.[0]?.issue ??
      payload.message ??
      payload.error_description ??
      `PayPal request failed with status ${response.status}.`
    );
  } catch {
    return `PayPal request failed with status ${response.status}.`;
  }
}

async function getPayPalAccessToken(
  mode: PayPalMode,
  apiBaseUrl: string,
  clientId: string,
  clientSecret: string,
) {
  if (
    cachedAccessToken &&
    cachedAccessTokenMode === mode &&
    Date.now() < cachedAccessToken.expiresAtMs - PAYPAL_TOKEN_REFRESH_BUFFER_MS
  ) {
    return cachedAccessToken.accessToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${apiBaseUrl}/v1/oauth2/token`, {
    body: "grant_type=client_credentials",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    const detail = await readPayPalErrorMessage(response);

    console.error("PayPal OAuth token request failed", {
      detail,
      status: response.status,
    });

    throw new PayPalClientError(
      "Could not connect to PayPal right now. Please try again shortly.",
    );
  }

  const payload = (await response.json()) as PayPalAccessTokenResponse;

  if (!payload.access_token) {
    console.error("PayPal OAuth token response missing access_token");

    throw new PayPalClientError(
      "Could not connect to PayPal right now. Please try again shortly.",
    );
  }

  const expiresInSeconds =
    typeof payload.expires_in === "number" && payload.expires_in > 0
      ? payload.expires_in
      : 32_400;

  cachedAccessToken = {
    accessToken: payload.access_token,
    expiresAtMs: Date.now() + expiresInSeconds * 1_000,
  };
  cachedAccessTokenMode = mode;

  return payload.access_token;
}

async function getPayPalApiAccessToken() {
  const mode = getPayPalMode();
  const apiBaseUrl = getPayPalApiBaseUrl(mode);
  const { clientId, clientSecret } = getPayPalCredentials();
  const accessToken = await getPayPalAccessToken(mode, apiBaseUrl, clientId, clientSecret);

  return {
    accessToken,
    apiBaseUrl,
    mode,
  };
}

export function parsePayPalWebhookEvent(rawBody: string): PayPalWebhookEvent {
  const parsed = JSON.parse(rawBody) as PayPalWebhookEvent;

  if (!parsed || typeof parsed !== "object") {
    throw new PayPalClientError("Invalid PayPal webhook payload.", 400);
  }

  return parsed;
}

function getPayPalWebhookVerificationHeaders(headers: Headers) {
  return {
    authAlgo: headers.get("paypal-auth-algo"),
    certUrl: headers.get("paypal-cert-url"),
    transmissionId: headers.get("paypal-transmission-id"),
    transmissionSig: headers.get("paypal-transmission-sig"),
    transmissionTime: headers.get("paypal-transmission-time"),
  };
}

export function extractPayPalOrderIdFromWebhookEvent(event: PayPalWebhookEvent) {
  const orderId = event.resource?.supplementary_data?.related_ids?.order_id?.trim();

  return orderId || null;
}

export async function verifyPayPalWebhookSignature({
  headers,
  webhookEvent,
}: {
  headers: Headers;
  webhookEvent: PayPalWebhookEvent;
}) {
  const verificationHeaders = getPayPalWebhookVerificationHeaders(headers);

  if (
    !verificationHeaders.authAlgo ||
    !verificationHeaders.certUrl ||
    !verificationHeaders.transmissionId ||
    !verificationHeaders.transmissionSig ||
    !verificationHeaders.transmissionTime
  ) {
    console.error("PayPal webhook missing verification headers", verificationHeaders);

    return false;
  }

  const { accessToken, apiBaseUrl } = await getPayPalApiAccessToken();
  const webhookId = getPayPalWebhookId();

  const response = await fetch(`${apiBaseUrl}/v1/notifications/verify-webhook-signature`, {
    body: JSON.stringify({
      auth_algo: verificationHeaders.authAlgo,
      cert_url: verificationHeaders.certUrl,
      transmission_id: verificationHeaders.transmissionId,
      transmission_sig: verificationHeaders.transmissionSig,
      transmission_time: verificationHeaders.transmissionTime,
      webhook_event: webhookEvent,
      webhook_id: webhookId,
    }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const detail = await readPayPalErrorMessage(response);

    console.error("PayPal webhook verification request failed", {
      detail,
      status: response.status,
    });

    return false;
  }

  const payload = (await response.json()) as PayPalVerifyWebhookResponse;

  return payload.verification_status === "SUCCESS";
}

export async function capturePayPalOrder(orderId: string) {
  const { accessToken, apiBaseUrl } = await getPayPalApiAccessToken();

  const response = await fetch(`${apiBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    method: "POST",
  });

  if (!response.ok) {
    const detail = await readPayPalErrorMessage(response);

    console.error("PayPal capture order request failed", {
      detail,
      orderId,
      status: response.status,
    });

    throw new PayPalClientError(
      "Could not capture your PayPal payment. Please try again shortly.",
    );
  }

  const payload = (await response.json()) as PayPalCaptureOrderResponse;
  const capture = payload.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    captureId: capture?.id ?? null,
    captureStatus: capture?.status ?? null,
    orderId: payload.id ?? orderId,
    orderStatus: payload.status ?? null,
  };
}

export async function createPayPalCheckoutOrder(quote: ResolvedPurchaseQuote) {
  const { accessToken, apiBaseUrl } = await getPayPalApiAccessToken();

  const response = await fetch(`${apiBaseUrl}/v2/checkout/orders`, {
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: formatPayPalUsdAmount(quote.priceUSD),
          },
          description: buildPurchaseDescription(quote),
        },
      ],
    }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    method: "POST",
  });

  if (!response.ok) {
    const detail = await readPayPalErrorMessage(response);

    console.error("PayPal create order request failed", {
      detail,
      status: response.status,
    });

    throw new PayPalClientError(
      "Could not create your PayPal checkout order. Please try again shortly.",
    );
  }

  const payload = (await response.json()) as PayPalCreateOrderResponse;

  if (!payload.id) {
    console.error("PayPal create order response missing order id", {
      status: payload.status,
    });

    throw new PayPalClientError(
      "Could not create your PayPal checkout order. Please try again shortly.",
    );
  }

  return payload.id;
}
