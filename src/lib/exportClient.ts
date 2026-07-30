import type { ExportFileMeta, ExportFileType } from "./exportCost";
import { isServerRoutedVideoFileMeta } from "./exportCost";
import {
  isServerSideVideoExportRoute,
  type VideoExportRoute,
} from "./videoExportLimits";

export const SERVER_VIDEO_EXPORT_CREDIT_CHECK_FAILED_MESSAGE =
  "Could not verify credits for server video export. Please try again.";

export const SERVER_VIDEO_INSUFFICIENT_CREDITS_MESSAGE =
  "Server video export requires sufficient credits. Add credits to continue.";

export type ExportTier = "clean" | "watermarked";

export type ExportAuthorizationContext = {
  authorizeNotice?: string;
  balance?: number;
  cost: number;
  costNotice?: string;
  exportId: string;
  fileMeta: ExportFileMeta;
  fileType: ExportFileType;
  reason?: string;
  tier: ExportTier;
  videoDurationBaseCredits?: number;
  videoServerRouted?: boolean;
  videoSizeSurchargeCredits?: number;
};

export type ExportBillingResult = {
  balance?: number;
  notice?: string;
};

const AUTHORIZE_FAIL_SAFE_NOTICE =
  "Couldn't verify credits — exported with watermark.";

export const PDF_UPLOAD_FAIL_SAFE_NOTICE =
  "Couldn't upload PDF for credit check — exported with watermark.";

export const FILL_EXPORT_CREDIT_CHECK_FAILED_MESSAGE =
  "Could not verify credits for fill-text export. Please try again.";

const CONSUME_FAIL_NOTICE =
  "Export completed, but credits couldn't be deducted — please contact support if this persists.";

export function createExportId() {
  return crypto.randomUUID();
}

export function isCleanExportTier(tier: ExportTier) {
  return tier === "clean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAuthorizePayload(payload: unknown): ExportAuthorizationContext | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (payload.tier !== "clean" && payload.tier !== "watermarked") {
    return null;
  }

  return {
    tier: payload.tier,
    cost: typeof payload.cost === "number" ? payload.cost : 0,
    balance: typeof payload.balance === "number" ? payload.balance : undefined,
    reason: typeof payload.reason === "string" ? payload.reason : undefined,
    costNotice:
      typeof payload.costNotice === "string" ? payload.costNotice : undefined,
    videoDurationBaseCredits:
      typeof payload.videoDurationBaseCredits === "number"
        ? payload.videoDurationBaseCredits
        : undefined,
    videoServerRouted:
      typeof payload.videoServerRouted === "boolean"
        ? payload.videoServerRouted
        : undefined,
    videoSizeSurchargeCredits:
      typeof payload.videoSizeSurchargeCredits === "number"
        ? payload.videoSizeSurchargeCredits
        : undefined,
    exportId: "",
    fileMeta: {},
    fileType: "photo",
  };
}

export function createWatermarkedAuthorizationContext({
  exportId,
  fileMeta,
  fileType,
  notice = AUTHORIZE_FAIL_SAFE_NOTICE,
}: {
  exportId: string;
  fileMeta: ExportFileMeta;
  fileType: ExportFileType;
  notice?: string;
}): ExportAuthorizationContext {
  return {
    authorizeNotice: notice,
    cost: 0,
    exportId,
    fileMeta,
    fileType,
    tier: "watermarked",
  };
}

export class ExportAuthorizationRequiredError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "ExportAuthorizationRequiredError";
    this.status = status;
  }
}

export class ExportCreditCheckError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportCreditCheckError";
  }
}

export async function resolveExportAuthorizationStrict({
  exportId,
  fileMeta = {},
  fileType,
}: {
  exportId: string;
  fileMeta?: ExportFileMeta;
  fileType: ExportFileType;
}): Promise<ExportAuthorizationContext> {
  const response = await fetch("/api/export/authorize", {
    body: JSON.stringify({
      exportId,
      fileMeta,
      fileType,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    throw new ExportCreditCheckError(FILL_EXPORT_CREDIT_CHECK_FAILED_MESSAGE);
  }

  if (response.status === 401 || response.status === 403) {
    const message =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : "Sign in is required to export files.";
    throw new ExportAuthorizationRequiredError(message, response.status);
  }

  const parsed = parseAuthorizePayload(payload);

  if (!response.ok || !parsed) {
    const message =
      isRecord(payload) && typeof payload.error === "string"
        ? payload.error
        : FILL_EXPORT_CREDIT_CHECK_FAILED_MESSAGE;
    throw new ExportCreditCheckError(message);
  }

  if (!isCleanExportTier(parsed.tier)) {
    throw new ExportCreditCheckError(
      "Fill-text export requires sufficient credits. Add credits or remove fill-text fields, then try again.",
    );
  }

  return {
    ...parsed,
    exportId,
    fileMeta,
    fileType,
  };
}

export async function resolveVideoExportAuthorization({
  exportId,
  exportRoute,
  fileMeta,
}: {
  exportId: string;
  exportRoute: VideoExportRoute;
  fileMeta: ExportFileMeta;
}): Promise<ExportAuthorizationContext> {
  const isServerRouted = isServerSideVideoExportRoute(exportRoute);

  try {
    const response = await fetch("/api/export/authorize", {
      body: JSON.stringify({
        exportId,
        fileMeta,
        fileType: "video",
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      if (response.status === 401 || response.status === 403) {
        throw new ExportAuthorizationRequiredError(
          "Sign in is required to export files.",
          response.status,
        );
      }

      if (isServerRouted) {
        throw new ExportCreditCheckError(
          SERVER_VIDEO_EXPORT_CREDIT_CHECK_FAILED_MESSAGE,
        );
      }

      return createWatermarkedAuthorizationContext({
        exportId,
        fileMeta,
        fileType: "video",
      });
    }

    if (response.status === 401 || response.status === 403) {
      const message =
        isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : "Sign in is required to export files.";
      throw new ExportAuthorizationRequiredError(message, response.status);
    }

    if (response.status === 402) {
      const message =
        isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : SERVER_VIDEO_INSUFFICIENT_CREDITS_MESSAGE;
      throw new ExportCreditCheckError(message);
    }

    const parsed = parseAuthorizePayload(payload);

    if (!response.ok || !parsed) {
      if (isServerRouted) {
        const message =
          isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : SERVER_VIDEO_EXPORT_CREDIT_CHECK_FAILED_MESSAGE;
        throw new ExportCreditCheckError(message);
      }

      return createWatermarkedAuthorizationContext({
        exportId,
        fileMeta,
        fileType: "video",
      });
    }

    if (isServerRouted && !isCleanExportTier(parsed.tier)) {
      throw new ExportCreditCheckError(SERVER_VIDEO_INSUFFICIENT_CREDITS_MESSAGE);
    }

    return {
      ...parsed,
      exportId,
      fileMeta,
      fileType: "video",
    };
  } catch (error) {
    if (
      error instanceof ExportAuthorizationRequiredError ||
      error instanceof ExportCreditCheckError
    ) {
      throw error;
    }

    if (isServerRouted || isServerRoutedVideoFileMeta(fileMeta)) {
      throw new ExportCreditCheckError(
        SERVER_VIDEO_EXPORT_CREDIT_CHECK_FAILED_MESSAGE,
      );
    }

    return createWatermarkedAuthorizationContext({
      exportId,
      fileMeta,
      fileType: "video",
    });
  }
}

export async function resolveExportAuthorization({
  exportId,
  fileMeta = {},
  fileType,
}: {
  exportId: string;
  fileMeta?: ExportFileMeta;
  fileType: ExportFileType;
}): Promise<ExportAuthorizationContext> {
  try {
    const response = await fetch("/api/export/authorize", {
      body: JSON.stringify({
        exportId,
        fileMeta,
        fileType,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      if (response.status === 401 || response.status === 403) {
        throw new ExportAuthorizationRequiredError(
          "Sign in is required to export files.",
          response.status,
        );
      }

      return createWatermarkedAuthorizationContext({
        exportId,
        fileMeta,
        fileType,
      });
    }

    if (response.status === 401 || response.status === 403) {
      const message =
        isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : "Sign in is required to export files.";
      throw new ExportAuthorizationRequiredError(message, response.status);
    }

    const parsed = parseAuthorizePayload(payload);

    if (!response.ok || !parsed) {
      return createWatermarkedAuthorizationContext({
        exportId,
        fileMeta,
        fileType,
      });
    }

    return {
      ...parsed,
      exportId,
      fileMeta,
      fileType,
    };
  } catch {
    return createWatermarkedAuthorizationContext({
      exportId,
      fileMeta,
      fileType,
    });
  }
}

export async function completeCleanExportBilling({
  auth,
}: {
  auth: ExportAuthorizationContext;
}): Promise<ExportBillingResult> {
  if (!isCleanExportTier(auth.tier)) {
    return {};
  }

  try {
    const response = await fetch("/api/export/consume", {
      body: JSON.stringify({
        exportId: auth.exportId,
        fileMeta: auth.fileMeta,
        fileType: auth.fileType,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    let payload: unknown = null;

    try {
      payload = await response.json();
    } catch {
      return { notice: CONSUME_FAIL_NOTICE };
    }

    const body = isRecord(payload) ? payload : {};

    if (response.status === 402) {
      return {
        balance: typeof body.balance === "number" ? body.balance : auth.balance,
        notice: CONSUME_FAIL_NOTICE,
      };
    }

    if (!response.ok) {
      return {
        balance: typeof body.balance === "number" ? body.balance : auth.balance,
        notice: CONSUME_FAIL_NOTICE,
      };
    }

    return {
      balance: typeof body.balance === "number" ? body.balance : auth.balance,
    };
  } catch {
    return { notice: CONSUME_FAIL_NOTICE };
  }
}

export function applyExportBillingToUi({
  auth,
  billing,
  setCreditBalance,
  setExportNotice,
}: {
  auth: ExportAuthorizationContext;
  billing: ExportBillingResult;
  setCreditBalance: (balance: number) => void;
  setExportNotice: (notice: string) => void;
}) {
  if (auth.authorizeNotice) {
    setExportNotice(auth.authorizeNotice);
  }

  if (typeof billing.balance === "number") {
    setCreditBalance(billing.balance);
  }

  if (billing.notice) {
    setExportNotice(billing.notice);
  }
}
