"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../../utils/supabase/client";

type DeletionRequest = {
  id: string;
  requested_at: string;
  sla_due_at: string;
  status: string;
};

type DeleteAccountSectionProps = {
  initialRequest: DeletionRequest | null;
  userId: string;
};

const supportEmail = "support@putwatermark.com";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function DeleteAccountSection({
  initialRequest,
  userId,
}: DeleteAccountSectionProps) {
  const router = useRouter();
  const [pendingRequest, setPendingRequest] = useState(initialRequest);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleConfirmDeletion() {
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("deletion_requests")
      .insert({ user_id: userId })
      .select("id, requested_at, sla_due_at, status")
      .single();

    setIsSubmitting(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "You already have a pending deletion request."
          : "We could not submit your deletion request. Please try again.",
      );
      router.refresh();
      return;
    }

    setPendingRequest(data);
    setShowConfirmation(false);
    setSuccessMessage(
      `Your deletion request has been received. Your account will be deleted within 30 days. If you change your mind, contact support at ${supportEmail}.`,
    );
    router.refresh();
  }

  async function handleCancelRequest() {
    if (!pendingRequest) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("deletion_requests")
      .delete()
      .eq("id", pendingRequest.id);

    setIsSubmitting(false);

    if (deleteError) {
      setError("We could not cancel your deletion request. Please try again.");
      return;
    }

    setPendingRequest(null);
    setShowConfirmation(false);
    router.refresh();
  }

  return (
    <div className="mt-14 border-t border-platinum/40 pt-6 text-left">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-battleship/60">
        Danger zone
      </p>

      {error ? (
        <div className="mt-4 rounded-2xl border border-signal/30 bg-signal/10 px-4 py-3 text-sm text-ink">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-platinum bg-platinum/60 px-4 py-3 text-sm leading-6 text-ink">
          {successMessage}
        </div>
      ) : null}

      {pendingRequest ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-5 text-battleship/80">
            Account deletion requested on{" "}
            <span className="font-medium text-ink">
              {formatDate(pendingRequest.requested_at)}
            </span>
            . Scheduled for{" "}
            <span className="font-medium text-ink">
              {formatDate(pendingRequest.sla_due_at)}
            </span>
            .
          </p>
          <button
            className="text-xs font-medium text-battleship/70 underline decoration-platinum/80 underline-offset-4 transition hover:text-battleship disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={handleCancelRequest}
            type="button"
          >
            {isSubmitting ? "Cancelling..." : "Cancel deletion request"}
          </button>
        </div>
      ) : (
        <div className="mt-3">
          {!showConfirmation ? (
            <button
              className="text-xs font-medium text-battleship/70 underline decoration-platinum/80 underline-offset-4 transition hover:text-battleship"
              onClick={() => {
                setError("");
                setSuccessMessage("");
                setShowConfirmation(true);
              }}
              type="button"
            >
              Delete my account
            </button>
          ) : (
            <div className="rounded-xl border border-platinum/60 bg-platinum/30 px-4 py-3">
              <p className="text-xs leading-5 text-battleship/80">
                Are you sure? This will permanently delete your account and data
                within 30 days. This cannot be undone.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-battleship/30 bg-paper px-3 py-1.5 text-xs font-semibold text-battleship transition hover:border-battleship/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  onClick={handleConfirmDeletion}
                  type="button"
                >
                  {isSubmitting ? "Submitting..." : "Yes, delete my account"}
                </button>
                <button
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-battleship/70 transition hover:text-battleship disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  onClick={() => setShowConfirmation(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
