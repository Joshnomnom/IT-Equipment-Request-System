"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { buttonStyles } from "@/components/page-layout";
import { Spinner } from "@/components/spinner";
import { api, ApiError } from "@/lib/api";
import { requestRef } from "@/lib/format";
import type { AdminRequisition } from "@/types/request";
import { RequestSummary } from "./request-summary";

export function ApproveDialog({
  request,
  onClose,
  onDone,
  onRejectInstead,
}: {
  request: AdminRequisition;
  onClose: () => void;
  onDone: (message: string) => void;
  onRejectInstead: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { stockQuantity, status: equipmentStatus, name } = request.equipment;
  const inactive = equipmentStatus !== "ACTIVE";
  const notEnoughStock = request.quantity > stockQuantity;
  // Agreed rule: no partial approval. If it can't be fulfilled, reject it
  // and the employee submits a new request.
  const blocked = inactive || notEnoughStock;

  async function handleApprove() {
    setError(null);
    setSubmitting(true);
    try {
      await api<AdminRequisition>(`/admin/requests/${request.id}/approve`, { method: "PATCH" });
      onDone(
        `${requestRef(request.id)} approved. ${request.quantity} × ${name} deducted from stock.`,
      );
    } catch (err) {
      // The server re-checks stock inside the transaction, so it may refuse
      // even if the numbers on screen looked fine (another approval got there first).
      setError(err instanceof ApiError ? err.message : "Could not approve the request");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Approve request" onClose={onClose}>
      <div className="space-y-4">
        <RequestSummary request={request} />

        {blocked ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-medium">This request cannot be approved.</p>
            <p className="mt-1">
              {inactive
                ? `${name} is inactive and can no longer be issued.`
                : `${request.quantity} requested but only ${stockQuantity} in stock.`}{" "}
              Reject it so the employee can submit a new request.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-600">Stock after approval</span>
            <span className="font-medium tabular-nums text-slate-900">
              {stockQuantity} → {stockQuantity - request.quantity}
            </span>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={buttonStyles.secondary}>
            Cancel
          </button>
          {blocked ? (
            <button type="button" onClick={onRejectInstead} className={buttonStyles.danger}>
              Reject instead
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApprove}
              disabled={submitting}
              className={buttonStyles.success}
            >
              {submitting && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
              Confirm approval
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
