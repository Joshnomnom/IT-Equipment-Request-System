"use client";

import { useState } from "react";
import { Badge } from "@/components/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Equipment } from "@/types/equipment";
import { EquipmentFormModal } from "./equipment-form-modal";

/** null = closed, "new" = create form, Equipment = edit that item. */
type FormTarget = null | "new" | Equipment;

export default function AdminEquipmentPage() {
  const { state, reload } = useApiQuery<Equipment[]>("/equipment");
  const [formTarget, setFormTarget] = useState<FormTarget>(null);

  const addButton = (
    <button
      onClick={() => setFormTarget("new")}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      Add equipment
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Manage Equipment</h1>
          <p className="mt-1 text-sm text-slate-500">
            Add items, adjust stock, or set an item inactive to retire it.
          </p>
        </div>
        {addButton}
      </div>

      <div className="mt-6">
        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && (
          <ErrorState message={state.message} onRetry={() => void reload()} />
        )}
        {state.status === "success" &&
          (state.data.length === 0 ? (
            <EmptyState title="No equipment yet" action={addButton} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 text-right font-medium">Stock</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.data.map((item) => (
                    <tr key={item.id} className={item.status === "INACTIVE" ? "text-slate-400" : ""}>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.stockQuantity === 0 ? (
                          <span className="text-red-600">0</span>
                        ) : (
                          item.stockQuantity
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={item.status === "ACTIVE" ? "green" : "gray"}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setFormTarget(item)}
                          className="text-blue-600 hover:underline"
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
      </div>

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
    </div>
  );
}
