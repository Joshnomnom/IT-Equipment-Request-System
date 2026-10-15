"use client";

import Link from "next/link";
import { useState } from "react";
import {
  buttonStyles,
  PageHeader,
  SectionCard,
  StatCard,
  tableStyles as t,
} from "@/components/page-layout";
import { RequestFormModal } from "@/components/request-form-modal";
import { RequestStatusBadge } from "@/components/request-status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { SuccessBanner } from "@/components/success-banner";
import { useApiQuery } from "@/hooks/use-api-query";
import { formatDateTime, requestRef } from "@/lib/format";
import type { Requisition } from "@/types/request";

export default function MyRequestsPage() {
  const { state, reload } = useApiQuery<Requisition[]>("/requests/me");
  const [editing, setEditing] = useState<Requisition | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const requests = state.status === "success" ? state.data : [];
  const count = (status: Requisition["status"]) =>
    requests.filter((r) => r.status === status).length;

  return (
    <>
      <PageHeader
        breadcrumb={["Requisition", "My Requests"]}
        title="My Requests"
        description="Equipment requests you have submitted and their approval status."
        actions={
          <Link href="/equipment" className={buttonStyles.primary}>
            New request
          </Link>
        }
      />

      {notice && <SuccessBanner message={notice} onDismiss={() => setNotice(null)} />}

      {state.status === "success" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Pending" value={count("PENDING")} accent="brand" />
          <StatCard label="Approved" value={count("APPROVED")} accent="green" />
          <StatCard label="Rejected" value={count("REJECTED")} accent="red" />
        </div>
      )}

      <SectionCard title="Request history" description="Newest first">
        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && (
          <div className="p-5">
            <ErrorState message={state.message} onRetry={() => void reload()} />
          </div>
        )}
        {state.status === "success" &&
          (requests.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="You have not submitted any requests"
                description="Browse the equipment catalogue to make your first request."
                action={
                  <Link href="/equipment" className={buttonStyles.primary}>
                    Go to catalogue
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={t.table}>
                <thead className={t.thead}>
                  <tr>
                    <th className={t.th}>Reference</th>
                    <th className={t.th}>Equipment</th>
                    <th className={`${t.th} text-right`}>Qty</th>
                    <th className={t.th}>Reason</th>
                    <th className={t.th}>Status</th>
                    <th className={t.th}>Submitted</th>
                    <th className={`${t.th} text-right`}>Action</th>
                  </tr>
                </thead>
                <tbody className={t.tbody}>
                  {requests.map((r) => (
                    <tr key={r.id} className="align-top hover:bg-slate-50">
                      <td className={`${t.td} whitespace-nowrap font-mono text-xs text-slate-600`}>
                        {requestRef(r.id)}
                      </td>
                      <td className={t.td}>
                        <p className="font-medium text-slate-900">{r.equipment.name}</p>
                        <p className="text-xs text-slate-500">{r.equipment.category}</p>
                      </td>
                      <td className={`${t.td} text-right tabular-nums`}>{r.quantity}</td>
                      <td className={`${t.td} max-w-xs text-slate-600`}>
                        <p className="line-clamp-2" title={r.reason}>{r.reason}</p>
                      </td>
                      <td className={t.td}>
                        <RequestStatusBadge status={r.status} />
                        {r.status === "REJECTED" && r.rejectReason && (
                          <p className="mt-1 max-w-[14rem] text-xs text-red-700">
                            Reason: {r.rejectReason}
                          </p>
                        )}
                        {r.status === "APPROVED" && r.approvedAt && (
                          <p className="mt-1 whitespace-nowrap text-xs text-slate-500">
                            {formatDateTime(r.approvedAt)}
                          </p>
                        )}
                      </td>
                      <td className={`${t.td} whitespace-nowrap text-slate-600`}>
                        {formatDateTime(r.createdAt)}
                      </td>
                      <td className={`${t.td} text-right`}>
                        {r.status === "PENDING" ? (
                          <button
                            onClick={() => setEditing(r)}
                            className={`${buttonStyles.secondary} px-3 py-1 text-xs`}
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </SectionCard>

      {editing && (
        <RequestFormModal
          equipment={editing.equipment}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            setNotice(message);
            void reload();
          }}
        />
      )}
    </>
  );
}
