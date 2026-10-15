"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import { PlusIcon } from "@/components/icons";
import {
  buttonStyles,
  PageHeader,
  SectionCard,
  StatCard,
  tableStyles as t,
} from "@/components/page-layout";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Equipment } from "@/types/equipment";
import { EquipmentFormModal } from "./equipment-form-modal";

/** null = closed, "new" = create form, Equipment = edit that item. */
type FormTarget = null | "new" | Equipment;

export default function AdminEquipmentPage() {
  const { state, reload } = useApiQuery<Equipment[]>("/equipment");
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const items = state.status === "success" ? state.data : [];

  const addButton = (
    <button onClick={() => setFormTarget("new")} className={buttonStyles.primary}>
      <PlusIcon className="h-4 w-4" />
      Add equipment
    </button>
  );

  return (
    <>
      <PageHeader
        breadcrumb={["Inventory", "Equipment Management"]}
        title="Equipment Management"
        description="Register equipment, adjust stock levels, or set an item inactive to retire it."
        actions={addButton}
      />

      {state.status === "success" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total items" value={items.length} />
          <StatCard
            label="Active"
            value={items.filter((i) => i.status === "ACTIVE").length}
            accent="green"
          />
          <StatCard
            label="Inactive"
            value={items.filter((i) => i.status === "INACTIVE").length}
            accent="gray"
          />
          <StatCard
            label="Out of stock"
            value={items.filter((i) => i.stockQuantity === 0).length}
            accent="red"
          />
        </div>
      )}

      <SectionCard title="Equipment register" description="All items, including inactive">
        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && (
          <div className="p-5">
            <ErrorState message={state.message} onRetry={() => void reload()} />
          </div>
        )}
        {state.status === "success" &&
          (items.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No equipment registered yet" action={addButton} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={t.table}>
                <thead className={t.thead}>
                  <tr>
                    <th className={t.th}>Equipment</th>
                    <th className={t.th}>Category</th>
                    <th className={`${t.th} text-right`}>Stock</th>
                    <th className={t.th}>Status</th>
                    <th className={`${t.th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={t.tbody}>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 ${item.status === "INACTIVE" ? "text-slate-400" : ""}`}
                    >
                      <td className={`${t.td} font-medium`}>{item.name}</td>
                      <td className={t.td}>{item.category}</td>
                      <td className={`${t.td} text-right tabular-nums`}>
                        {item.stockQuantity === 0 ? (
                          <span className="font-medium text-red-600">0</span>
                        ) : (
                          item.stockQuantity
                        )}
                      </td>
                      <td className={t.td}>
                        <Badge tone={item.status === "ACTIVE" ? "green" : "gray"}>
                          {item.status === "ACTIVE" ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className={`${t.td} text-right`}>
                        <button
                          onClick={() => setFormTarget(item)}
                          className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </SectionCard>

      {formTarget !== null && (
        <EquipmentFormModal
          equipment={formTarget === "new" ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
