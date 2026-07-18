import { createAdminClient } from "../../utils/supabase/admin";
import {
  calculateExportCost,
  ExportCostError,
  resolvePhotoExportCount,
  type ExportFileMeta,
  type ExportFileType,
} from "./exportCost";

export const EXPORT_AUTHORIZE_RATE_LIMIT = 10;
export const EXPORT_AUTHORIZE_RATE_WINDOW_MS = 60_000;

export type ExportAuthorizeDecision = "clean" | "watermarked";

export type ExportAuthorizeReason = "anonymous" | "insufficient_credits";

export type ExportAuthorizeResult = {
  allowed: true;
  tier: ExportAuthorizeDecision;
  cost: number;
  balance?: number;
  reason?: ExportAuthorizeReason;
};

export class ExportAuthorizeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ExportAuthorizeError";
    this.status = status;
  }
}

const EXPORT_FILE_TYPES = new Set<ExportFileType>([
  "photo",
  "pdf",
  "video",
  "signature",
]);

const EXPORT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeExportId(exportId: string) {
  const normalized = exportId.trim();

  if (!EXPORT_ID_PATTERN.test(normalized)) {
    throw new ExportAuthorizeError("Invalid exportId.");
  }

  return normalized;
}

export function parseExportFileType(fileType: string): ExportFileType {
  if (!EXPORT_FILE_TYPES.has(fileType as ExportFileType)) {
    throw new ExportAuthorizeError("Invalid fileType.");
  }

  return fileType as ExportFileType;
}

export function parseExportFileMeta(
  fileType: ExportFileType,
  exportId: string,
  fileMeta: unknown,
): ExportFileMeta {
  if (!fileMeta || typeof fileMeta !== "object") {
    if (fileType === "pdf") {
      throw new ExportAuthorizeError("PDF export requires fileMeta.storagePath.");
    }

    return {};
  }

  const meta = fileMeta as {
    storagePath?: unknown;
    durationSeconds?: unknown;
    photoCount?: unknown;
  };

  const parsed: ExportFileMeta = {};

  if (fileType === "photo") {
    if (meta.photoCount === undefined) {
      parsed.photoCount = 1;
    } else if (
      typeof meta.photoCount === "number" &&
      Number.isInteger(meta.photoCount)
    ) {
      parsed.photoCount = meta.photoCount;
    } else {
      throw new ExportAuthorizeError("photoCount must be an integer.");
    }

    try {
      resolvePhotoExportCount(parsed);
    } catch (error) {
      if (error instanceof ExportCostError) {
        throw new ExportAuthorizeError(error.message);
      }

      throw error;
    }
  }

  if (typeof meta.storagePath === "string" && meta.storagePath.trim()) {
    const storagePath = meta.storagePath.trim();

    if (!storagePath.startsWith(`exports/${exportId}/`)) {
      throw new ExportAuthorizeError("storagePath does not match exportId.");
    }

    parsed.storagePath = storagePath;
  }

  if (
    typeof meta.durationSeconds === "number" &&
    Number.isFinite(meta.durationSeconds) &&
    meta.durationSeconds > 0
  ) {
    parsed.durationSeconds = meta.durationSeconds;
  }

  if (fileType === "pdf" && !parsed.storagePath) {
    throw new ExportAuthorizeError("PDF export requires fileMeta.storagePath.");
  }

  return parsed;
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    const firstHop = forwarded.split(",")[0]?.trim();
    if (firstHop) {
      return firstHop;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

export async function countRecentExportAuthorizations({
  ipAddress,
  userId,
}: {
  ipAddress: string | null;
  userId: string | null;
}) {
  if (!userId && !ipAddress) {
    return 0;
  }

  const supabase = createAdminClient();
  const windowStart = new Date(
    Date.now() - EXPORT_AUTHORIZE_RATE_WINDOW_MS,
  ).toISOString();

  let query = supabase
    .from("export_authorizations")
    .select("id", { count: "exact", head: true })
    .gt("created_at", windowStart);

  // Authenticated: count by user_id only. Anonymous: count by ip_address only.
  // Do not use PostgREST `.or()` string filters with raw UUIDs/IPs — hyphens and
  // dots break parsing and can silently return count 0.
  if (userId) {
    query = query.eq("user_id", userId);
  } else if (ipAddress) {
    query = query.eq("ip_address", ipAddress);
  }

  const { count, error } = await query;

  if (error) {
    throw new ExportAuthorizeError(
      "Could not verify export authorization rate limit.",
      503,
    );
  }

  return count ?? 0;
}

async function getUserCreditBalance(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("credit_balances")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ExportAuthorizeError("Could not read credit balance.", 503);
  }

  return data?.balance ?? 0;
}

function qualifiesForCleanExport({
  balance,
  cost,
  fileType,
}: {
  balance: number;
  cost: number;
  fileType: ExportFileType;
}) {
  if (fileType === "video") {
    // Video overage pricing is not calibrated yet (cost may be 0). Until real
    // per-second rates exist, only users with credits may export clean video.
    return balance > 0;
  }

  return balance >= cost;
}

async function logExportAuthorization({
  balanceAtCheck,
  cost,
  decision,
  exportId,
  fileType,
  ipAddress,
  reason,
  userId,
}: {
  balanceAtCheck: number | null;
  cost: number;
  decision: ExportAuthorizeDecision;
  exportId: string;
  fileType: ExportFileType;
  ipAddress: string | null;
  reason: ExportAuthorizeReason | null;
  userId: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("try_insert_export_authorization", {
    p_balance_at_check: balanceAtCheck,
    p_cost: cost,
    p_decision: decision,
    p_export_id: exportId,
    p_file_type: fileType,
    p_ip_address: ipAddress,
    p_limit: EXPORT_AUTHORIZE_RATE_LIMIT,
    p_reason: reason,
    p_user_id: userId,
    p_window_seconds: EXPORT_AUTHORIZE_RATE_WINDOW_MS / 1000,
  });

  if (error) {
    if (error.message?.includes("export_authorize_rate_limited")) {
      throw new ExportAuthorizeError(
        "Too many export authorization requests. Please wait a moment and try again.",
        429,
      );
    }

    throw new ExportAuthorizeError(
      "Could not record export authorization.",
      503,
    );
  }
}

export async function authorizeExport({
  exportId,
  fileMeta,
  fileType,
  ipAddress,
  userId,
}: {
  exportId: string;
  fileMeta: ExportFileMeta;
  fileType: ExportFileType;
  ipAddress: string | null;
  userId: string | null;
}): Promise<ExportAuthorizeResult> {
  const recentCount = await countRecentExportAuthorizations({
    ipAddress,
    userId,
  });

  if (recentCount >= EXPORT_AUTHORIZE_RATE_LIMIT) {
    throw new ExportAuthorizeError(
      "Too many export authorization requests. Please wait a moment and try again.",
      429,
    );
  }

  let costResult;

  try {
    costResult = await calculateExportCost(fileType, fileMeta);
  } catch (error) {
    if (error instanceof ExportCostError) {
      throw new ExportAuthorizeError(error.message, 400);
    }

    throw error;
  }

  const cost = costResult.cost;

  if (fileType === "photo") {
    console.info("[export-authorize] photo export", {
      cost,
      exportId,
      photoCount: costResult.photoCount ?? resolvePhotoExportCount(fileMeta),
      userId: userId ?? "anonymous",
    });
  }

  if (!userId) {
    await logExportAuthorization({
      balanceAtCheck: null,
      cost,
      decision: "watermarked",
      exportId,
      fileType,
      ipAddress,
      reason: "anonymous",
      userId: null,
    });

    return {
      allowed: true,
      cost,
      reason: "anonymous",
      tier: "watermarked",
    };
  }

  const balance = await getUserCreditBalance(userId);

  if (qualifiesForCleanExport({ balance, cost, fileType })) {
    await logExportAuthorization({
      balanceAtCheck: balance,
      cost,
      decision: "clean",
      exportId,
      fileType,
      ipAddress,
      reason: null,
      userId,
    });

    return {
      allowed: true,
      balance,
      cost,
      tier: "clean",
    };
  }

  await logExportAuthorization({
    balanceAtCheck: balance,
    cost,
    decision: "watermarked",
    exportId,
    fileType,
    ipAddress,
    reason: "insufficient_credits",
    userId,
  });

  return {
    allowed: true,
    balance,
    cost,
    reason: "insufficient_credits",
    tier: "watermarked",
  };
}
