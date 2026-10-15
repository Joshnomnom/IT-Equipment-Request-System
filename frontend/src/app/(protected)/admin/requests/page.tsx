"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { PageHeader, SectionCard, tableStyles as t } from "@/components/page-layout";
import { Pagination } from "@/components/pagination";
import { RequestStatusBadge } from "@/components/request-status-badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { useApiQuery } from "@/hooks/use-api-query";
import { formatDateTime, requestRef } from "@/lib/format";
import type { AdminRequestList, RequestStatus } from "@/types/request";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

type Tab = RequestStatus | "ALL";
const TABS: { value: Tab; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

function isTab(value: string | null): value is Tab {
  return TABS.some((tab) => tab.value === value);
}

export default function AdminRequestsPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<LoadingState />}>
      <AdminRequests />
    </Suspense>
  );
}

function AdminRequests() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Filters live in the URL so refresh, back/forward and shared links keep them.
  // No ?status= means the admin's work queue: Pending.
  const statusParam = params.get("status");
  const tab: Tab = isTab(statusParam) ? statusParam : "PENDING";
  const search = params.get("search") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const setParams = useCallback(
    (updates: { status?: Tab; search?: string; page?: number }) => {
      const next = new URLSearchParams(params.toString());
      const set = (key: string, value: string | undefined) =>
        value ? next.set(key, value) : next.delete(key);
      if (updates.status !== undefined) {
        set("status", updates.status === "PENDING" ? undefined : updates.status);
      }
      if (updates.search !== undefined) set("search", updates.search.trim());
      if (updates.page !== undefined) {
        set("page", updates.page > 1 ? String(updates.page) : undefined);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // Search box: type freely, push to the URL after a short pause.
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = setTimeout(
      () => setParams({ search: searchInput, page: 1 }),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchInput, search, setParams]);

  const apiQuery = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (tab !== "ALL") apiQuery.set("status", tab);
  if (search) apiQuery.set("search", search);
  const { state, reload } = useApiQuery<AdminRequestList>(`/admin/requests?${apiQuery}`);

  const counts = state.status === "success" ? state.data.counts : null;
  const countFor = (value: Tab) =>
    counts === null
      ? null
      : value === "ALL"
        ? counts.PENDING + counts.APPROVED + counts.REJECTED
        : counts[value];

  return (
    <>
      <PageHeader
        breadcrumb={["Approval", "Requisition Requests"]}
        title="Requisition Requests"
        description="Review equipment requests submitted by employees."
      />

      <SectionCard
        title="Requests"
        description="Search by equipment or requester name"
        actions={
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search…"
            aria-label="Search requests"
            maxLength={100}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 sm:w-64"
          />
        }
      >
        {/* Status tabs */}
        <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3">
          {TABS.map(({ value, label }) => {
            const active = value === tab;
            const count = countFor(value);
            return (
              <button
                key={value}
                role="tab"
                aria-selected={active}
                onClick={() => setParams({ status: value, page: 1 })}
                className={`-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm ${
                  active
                    ? "border-brand-700 font-medium text-brand-800"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
                {count !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                      active ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && (
          <div className="p-5">
            <ErrorState message={state.message} onRetry={() => void reload()} />
          </div>
        )}
        {state.status === "success" &&
          (state.data.data.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title={search ? "No requests match your search" : "No requests here"}
                description={
                  search
                    ? `Nothing found for “${search}” in this tab.`
                    : tab === "PENDING"
                      ? "All caught up — there are no requests waiting for review."
                      : undefined
                }
              />
            </div>
          ) : (
            <div className={state.refreshing ? "opacity-60 transition-opacity" : ""}>
              <div className="overflow-x-auto">
                <table className={t.table}>
                  <thead className={t.thead}>
                    <tr>
                      <th className={t.th}>Reference</th>
                      <th className={t.th}>Requester</th>
                      <th className={t.th}>Equipment</th>
                      <th className={`${t.th} text-right`}>Qty</th>
                      <th className={t.th}>Reason</th>
                      <th className={t.th}>Status</th>
                      <th className={t.th}>Submitted</th>
                    </tr>
                  </thead>
                  <tbody className={t.tbody}>
                    {state.data.data.map((r) => {
                      const exceedsStock =
                        r.status === "PENDING" && r.quantity > r.equipment.stockQuantity;
                      return (
                        <tr key={r.id} className="align-top hover:bg-slate-50">
                          <td className={`${t.td} whitespace-nowrap font-mono text-xs text-slate-600`}>
                            {requestRef(r.id)}
                          </td>
                          <td className={t.td}>
                            <p className="font-medium text-slate-900">{r.user.name}</p>
                            <p className="text-xs text-slate-500">{r.user.email}</p>
                          </td>
                          <td className={t.td}>
                            <p className="font-medium text-slate-900">{r.equipment.name}</p>
                            <p className="text-xs text-slate-500">{r.equipment.category}</p>
                          </td>
                          <td className={`${t.td} whitespace-nowrap text-right tabular-nums`}>
                            <p className={exceedsStock ? "font-semibold text-red-600" : ""}>
                              {r.quantity}
                            </p>
                            {r.status === "PENDING" && (
                              <p
                                className={`text-xs ${exceedsStock ? "text-red-600" : "text-slate-400"}`}
                              >
                                {r.equipment.stockQuantity} in stock
                              </p>
                            )}
                          </td>
                          <td className={`${t.td} max-w-xs text-slate-600`}>
                            <p className="line-clamp-2" title={r.reason}>
                              {r.reason}
                            </p>
                          </td>
                          <td className={t.td}>
                            <RequestStatusBadge status={r.status} />
                            {r.reviewedBy && (
                              <p className="mt-1 whitespace-nowrap text-xs text-slate-500">
                                by {r.reviewedBy.name}
                              </p>
                            )}
                            {r.status === "REJECTED" && r.rejectReason && (
                              <p className="mt-1 max-w-[14rem] text-xs text-red-700">
                                {r.rejectReason}
                              </p>
                            )}
                          </td>
                          <td className={`${t.td} whitespace-nowrap text-slate-600`}>
                            {formatDateTime(r.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                meta={state.data.meta}
                onPageChange={(next) => setParams({ page: next })}
              />
            </div>
          ))}
      </SectionCard>
    </>
  );
}
