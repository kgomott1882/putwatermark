import type { ExportFileMeta, ExportFileType } from "./exportCost";

export type ExportTier = "clean" | "watermarked";

export type ExportAuthorizationContext = {
  authorizeNotice?: string;
  balance?: number;
  cost: number;
  exportId: string;
  fileMeta: ExportFileMeta;
  fileType: ExportFileType;
  reason?: string;
  tier: ExportTier;
};

export type ExportBillingResult = {
  balance?: number;
  notice?: string;
};

const AUTHORIZE_FAIL_SAFE_NOTICE =
  "Couldn't verify credits — exported with watermark.";

export const PDF_UPLOAD_FAIL_SAFE_NOTICE =
  "Couldn't upload PDF for credit check — exported with watermark.";

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
      return createWatermarkedAuthorizationContext({
        exportId,
        fileMeta,
        fileType,
      });
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
