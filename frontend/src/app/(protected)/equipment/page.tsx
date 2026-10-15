"use client";

import { Badge } from "@/components/badge";
import {
  PageHeader,
  SectionCard,
  StatCard,
  tableStyles as t,
} from "@/components/page-layout";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Equipment } from "@/types/equipment";

export default function EquipmentPage() {
  const { state, reload } = useApiQuery<Equipment[]>("/equipment");
  const items = state.status === "success" ? state.data : [];
  const available = items.filter((i) => i.stockQuantity > 0).length;

  return (
    <>
      <PageHeader
        breadcrumb={["Requisition", "Equipment Catalogue"]}
        title="Equipment Catalogue"
        description="IT equipment currently offered for requisition."
      />

      {state.status === "success" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Items listed" value={items.length} />
          <StatCard label="Available" value={available} accent="green" />
          <StatCard label="Out of stock" value={items.length - available} accent="gray" />
        </div>
      )}

      <SectionCard title="Equipment list" description="Sorted by category and name">
        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && (
          <div className="p-5">
            <ErrorState message={state.message} onRetry={() => void reload()} />
          </div>
        )}
        {state.status === "success" &&
          (items.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No equipment available"
                description="Please check back later."
              />
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
                  </tr>
                </thead>
                <tbody className={t.tbody}>
                  {items.map((item) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </SectionCard>
    </>
  );
}
