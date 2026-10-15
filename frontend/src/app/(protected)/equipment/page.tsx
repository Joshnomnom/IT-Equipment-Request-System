"use client";

import { Badge } from "@/components/badge";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { useApiQuery } from "@/hooks/use-api-query";
import type { Equipment } from "@/types/equipment";

export default function EquipmentPage() {
  const { state, reload } = useApiQuery<Equipment[]>("/equipment");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Equipment</h1>
      <p className="mt-1 text-sm text-slate-500">
        IT equipment available to request.
      </p>

      <div className="mt-6">
        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && (
          <ErrorState message={state.message} onRetry={() => void reload()} />
        )}
        {state.status === "success" &&
          (state.data.length === 0 ? (
            <EmptyState
              title="No equipment available"
              description="Please check back later."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 text-right font-medium">In stock</th>
                    <th className="px-4 py-3 font-medium">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.data.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600">{item.category}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.stockQuantity}
                      </td>
                      <td className="px-4 py-3">
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
      </div>
    </div>
  );
}
