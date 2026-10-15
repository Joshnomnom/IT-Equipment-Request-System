"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/modal";
import { buttonStyles } from "@/components/page-layout";
import { Spinner } from "@/components/spinner";
import { api, ApiError } from "@/lib/api";
import { requestRef } from "@/lib/format";
import type { AdminRequisition } from "@/types/request";
import { RequestSummary } from "./request-summary";

const REASON_MAX = 500;

export function RejectDialog({
  request,
  onClose,
  onDone,
}: {
  request: AdminRequisition;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim() === "") {
      setError("A reason is required so the employee knows why");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api<AdminRequisition>(`/admin/requests/${request.id}/reject`, {
        method: "PATCH",
        json: { rejectReason: reason },
      });
      onDone(`${requestRef(request.id)} rejected. Stock was not changed.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reject the request");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Reject request" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <RequestSummary request={request} />

        <label className="block">
          <span className="text-sm font-medium">
            Reason for rejection <span className="text-red-600">*</span>
          </span>
          <textarea
            required
            rows={4}
            maxLength={REASON_MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="This will be shown to the employee"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
          <span className="mt-1 block text-right text-xs text-slate-400">
            {reason.length}/{REASON_MAX}
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={buttonStyles.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={buttonStyles.danger}>
            {submitting && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
            Reject request
          </button>
        </div>
      </form>
    </Modal>
  );
}
