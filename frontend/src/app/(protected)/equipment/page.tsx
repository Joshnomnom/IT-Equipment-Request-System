"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/badge";
import {
  buttonStyles,
  PageHeader,
  SectionCard,
  StatCard,
  tableStyles as t,
} from "@/components/page-layout";
import { RequestFormModal } from "@/components/request-form-modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { SuccessBanner } from "@/components/success-banner";
import { useAuth } from "@/context/auth-context";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Equipment } from "@/types/equipment";
import type { Requisition } from "@/types/request";

interface FormTarget {
  equipment: Equipment;
  existing?: Requisition;
}

export default function EquipmentPage() {
  const { state: auth } = useAuth();
  const isEmployee = auth.status === "authenticated" && auth.user.role === "EMPLOYEE";

  const equipmentQuery = useApiQuery<Equipment[]>("/equipment");
  // Only employees have requests; admins just browse the catalogue here.
  const requestsQuery = useApiQuery<Requisition[]>(isEmployee ? "/requests/me" : null);

  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const state = equipmentQuery.state;
  const items = state.status === "success" ? state.data : [];
  const available = items.filter((i) => i.stockQuantity > 0).length;

  // equipmentId -> the employee's PENDING request for it (at most one).
  const pendingByEquipment = useMemo(() => {
    const map = new Map<number, Requisition>();
    if (requestsQuery.state.status === "success") {
      for (const r of requestsQuery.state.data) {
        if (r.status === "PENDING") map.set(r.equipmentId, r);
      }
    }
    return map;
  }, [requestsQuery.state]);

  function reloadAll() {
    void equipmentQuery.reload();
    void requestsQuery.reload();
  }

  return (
    <>
      <PageHeader
        breadcrumb={["Requisition", "Equipment Catalogue"]}
        title="Equipment Catalogue"
        description="IT equipment currently offered for requisition."
      />

      {notice && <SuccessBanner message={notice} onDismiss={() => setNotice(null)} />}

      {state.status === "success" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Items listed" value={items.length} />
          <StatCard label="Available" value={available} accent="green" />
          {isEmployee ? (
            <StatCard label="Your pending requests" value={pendingByEquipment.size} accent="brand" />
          ) : (
            <StatCard label="Out of stock" value={items.length - available} accent="gray" />
          )}
        </div>
      )}

      <SectionCard
        title="Equipment list"
        description={
          isEmployee
            ? "One pending request per item — edit it to change the quantity"
            : "Sorted by category and name"
        }
      >
        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && (
          <div className="p-5">
            <ErrorState message={state.message} onRetry={reloadAll} />
          </div>
        )}
        {state.status === "success" &&
          (items.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No equipment available" description="Please check back later." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={t.table}>
                <thead className={t.thead}>
                  <tr>
                    <th className={t.th}>Equipment</th>
                    <th className={t.th}>Category</th>
                    <th className={`${t.th} text-right`}>In stock</th>
                    <th className={t.th}>Availability</th>
                    {isEmployee && <th className={`${t.th} text-right`}>Action</th>}
                  </tr>
                </thead>
                <tbody className={t.tbody}>
                  {items.map((item) => {
                    const pending = pendingByEquipment.get(item.id);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className={`${t.td} font-medium text-slate-900`}>{item.name}</td>
                        <td className={`${t.td} text-slate-600`}>{item.category}</td>
                        <td className={`${t.td} text-right tabular-nums`}>{item.stockQuantity}</td>
                        <td className={t.td}>
                          {item.stockQuantity > 0 ? (
                            <Badge tone="green">Available</Badge>
                          ) : (
                            <Badge tone="gray">Out of stock</Badge>
                          )}
                        </td>
                        {isEmployee && (
                          <td className={`${t.td} text-right`}>
                            {pending ? (
                              <div className="flex items-center justify-end gap-3">
                                <span className="whitespace-nowrap text-xs text-yellow-700">
                                  {pending.quantity} pending
                                </span>
                                <button
                                  onClick={() => setFormTarget({ equipment: item, existing: pending })}
                                  className={`${buttonStyles.secondary} whitespace-nowrap px-3 py-1 text-xs`}
                                >
                                  Edit request
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setFormTarget({ equipment: item })}
                                disabled={item.stockQuantity === 0}
                                title={item.stockQuantity === 0 ? "Out of stock" : undefined}
                                className={`${buttonStyles.primary} px-3 py-1 text-xs disabled:cursor-not-allowed`}
                              >
                                Request
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
      </SectionCard>

      {isEmployee && (
        <p className="text-sm text-slate-500">
          Track the status of your submissions under{" "}
          <Link href="/requests" className="font-medium text-brand-700 hover:underline">
            My Requests
          </Link>
          .
        </p>
      )}

      {formTarget && (
        <RequestFormModal
          equipment={formTarget.equipment}
          existing={formTarget.existing}
          onClose={() => setFormTarget(null)}
          onSaved={(message) => {
            setFormTarget(null);
            setNotice(message);
            reloadAll();
          }}
        />
      )}
    </>
  );
}
