import { createAdminClient } from "../../utils/supabase/admin";
import {
  calculateExportCost,
  ExportCostError,
  type ExportFileMeta,
  type ExportFileType,
} from "./exportCost";

export type ExportConsumeSuccess = {
  balance: number;
  charged: boolean;
  cost: number;
  alreadyCharged?: boolean;
};

export class ExportConsumeError extends Error {
  code?: string;
  status: number;
  balance?: number;
  cost?: number;

  constructor(
    message: string,
    status = 400,
    options?: {
      code?: string;
      balance?: number;
      cost?: number;
    },
  ) {
    super(message);
    this.name = "ExportConsumeError";
    this.status = status;
    this.code = options?.code;
    this.balance = options?.balance;
    this.cost = options?.cost;
  }
}

type ConsumeExportCreditsResult = {
  success: boolean;
  balance: number;
  already_charged: boolean;
  cost: number;
  error_code?: string;
};

async function verifyCleanExportAuthorization(
  exportId: string,
  userId: string,
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("export_authorizations")
    .select("id, cost")
    .eq("export_id", exportId)
    .eq("user_id", userId)
    .eq("decision", "clean")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ExportConsumeError("Could not verify export authorization.", 503);
  }

  return data;
}

async function logFailedConsumeAttempt({
  balance,
  cost,
  exportId,
  fileType,
  reason,
  userId,
}: {
  balance: number | null;
  cost: number;
  exportId: string;
  fileType: ExportFileType;
  reason: string;
  userId: string;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("export_authorizations").insert({
    balance_at_check: balance,
    cost,
    decision: "watermarked",
    export_id: exportId,
    file_type: fileType,
    ip_address: null,
    reason,
    user_id: userId,
  });

  if (error) {
    console.error("Failed to log consume attempt", {
      error: error.message,
      exportId,
      reason,
      userId,
    });
  }
}

export async function consumeExportCredits({
  exportId,
  fileMeta,
  fileType,
  userId,
}: {
  exportId: string;
  fileMeta: ExportFileMeta;
  fileType: ExportFileType;
  userId: string;
}): Promise<ExportConsumeSuccess> {
  const authorization = await verifyCleanExportAuthorization(exportId, userId);

  if (!authorization) {
    await logFailedConsumeAttempt({
      balance: null,
      cost: 0,
      exportId,
      fileType,
      reason: "consume_unauthorized",
      userId,
    });

    throw new ExportConsumeError(
      "This export was not authorized for credit billing.",
      403,
      { code: "export_not_authorized" },
    );
  }

  let costResult;

  try {
    costResult = await calculateExportCost(fileType, fileMeta);
  } catch (error) {
    if (error instanceof ExportCostError) {
      throw new ExportConsumeError(error.message, 400);
    }

    throw error;
  }

  const cost = costResult.cost;

  if (authorization.cost !== cost) {
    await logFailedConsumeAttempt({
      balance: null,
      cost,
      exportId,
      fileType,
      reason: "consume_cost_mismatch",
      userId,
    });

    throw new ExportConsumeError(
      "Export billing does not match the authorized amount.",
      409,
      {
        code: "export_billing_mismatch",
        cost: authorization.cost,
      },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("consume_export_credits", {
    p_cost: cost,
    p_export_id: exportId,
    p_user_id: userId,
  });

  if (error) {
    throw new ExportConsumeError("Could not consume export credits.", 503);
  }

  const result = data as ConsumeExportCreditsResult | null;

  if (!result || typeof result.balance !== "number") {
    throw new ExportConsumeError("Could not consume export credits.", 503);
  }

  if (!result.success) {
    await logFailedConsumeAttempt({
      balance: result.balance,
      cost,
      exportId,
      fileType,
      reason: "consume_failed_insufficient_credits",
      userId,
    });

    throw new ExportConsumeError(
      "Insufficient credits to complete billing.",
      402,
      {
        balance: result.balance,
        code: "insufficient_credits_at_consume",
        cost,
      },
    );
  }

  return {
    alreadyCharged: result.already_charged,
    balance: result.balance,
    charged: !result.already_charged,
    cost: result.cost,
  };
}
