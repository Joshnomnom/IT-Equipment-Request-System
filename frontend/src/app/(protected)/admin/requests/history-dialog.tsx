"use client";

import { Modal } from "@/components/modal";
import { buttonStyles } from "@/components/page-layout";
import { RequestStatusBadge } from "@/components/request-status-badge";
import { ErrorState, LoadingState } from "@/components/state-views";
import { useApiQuery } from "@/hooks/use-api-query";
import { formatDateTime, requestRef } from "@/lib/format";
import type { AdminRequisition, AuditLogEntry } from "@/types/request";

/** Timeline of a request: submission, then every status change from the audit log. */
export function HistoryDialog({
  request,
  onClose,
}: {
  request: AdminRequisition;
  onClose: () => void;
}) {
  const { state, reload } = useApiQuery<AuditLogEntry[]>(
    `/admin/requests/${request.id}/audit-logs`,
  );

  return (
    <Modal title={`History — ${requestRef(request.id)}`} onClose={onClose}>
      {state.status === "loading" && <LoadingState />}
      {state.status === "error" && (
        <ErrorState message={state.message} onRetry={() => void reload()} />
      )}
      {state.status === "success" && (
        <ol className="relative space-y-5 border-l border-slate-200 pl-6">
          <li>
            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
            <p className="text-sm font-medium text-slate-900">
              Submitted by {request.user.name}
            </p>
            <p className="text-xs text-slate-500">{formatDateTime(request.createdAt)}</p>
            <div className="mt-1">
              <RequestStatusBadge status="PENDING" />
            </div>
          </li>
          {state.data.map((log) => (
            <li key={log.id}>
              <span
                className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white ${
                  log.newStatus === "APPROVED" ? "bg-green-600" : "bg-red-600"
                }`}
              />
              <p className="text-sm font-medium text-slate-900">
                {log.newStatus === "APPROVED" ? "Approved" : "Rejected"} by {log.user.name}
              </p>
              <p className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                {log.previousStatus && <RequestStatusBadge status={log.previousStatus} />}
                <span>→</span>
                <RequestStatusBadge status={log.newStatus} />
              </div>
              {log.newStatus === "REJECTED" && request.rejectReason && (
                <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                  {request.rejectReason}
                </p>
              )}
            </li>
          ))}
          {state.data.length === 0 && (
            <li className="text-sm text-slate-500">Awaiting review — no status changes yet.</li>
          )}
        </ol>
      )}
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onClose} className={buttonStyles.secondary}>
          Close
        </button>
      </div>
    </Modal>
  );
}
