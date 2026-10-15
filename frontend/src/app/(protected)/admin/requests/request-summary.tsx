import { requestRef } from "@/lib/format";
import type { AdminRequisition } from "@/types/request";

/** Compact read-only summary of a request, shown at the top of each dialog. */
export function RequestSummary({ request }: { request: AdminRequisition }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">Reference</dt>
        <dd className="font-mono text-slate-900">{requestRef(request.id)}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">Requester</dt>
        <dd className="text-slate-900">{request.user.name}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">Equipment</dt>
        <dd className="text-slate-900">{request.equipment.name}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-500">Quantity</dt>
        <dd className="tabular-nums text-slate-900">{request.quantity}</dd>
      </div>
      <div className="col-span-2">
        <dt className="text-xs uppercase tracking-wide text-slate-500">Reason</dt>
        <dd className="whitespace-pre-wrap text-slate-700">{request.reason}</dd>
      </div>
    </dl>
  );
}
