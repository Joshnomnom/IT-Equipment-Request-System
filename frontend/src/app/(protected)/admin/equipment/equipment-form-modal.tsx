"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/modal";
import { Spinner } from "@/components/spinner";
import { api, ApiError } from "@/lib/api";
import type { Equipment, EquipmentInput, EquipmentStatus } from "@/types/equipment";

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

/** Create (no `equipment`) or edit (with `equipment`) in one form. */
export function EquipmentFormModal({
  equipment,
  onClose,
  onSaved,
}: {
  equipment?: Equipment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = equipment !== undefined;
  const [name, setName] = useState(equipment?.name ?? "");
  const [category, setCategory] = useState(equipment?.category ?? "");
  const [stock, setStock] = useState(String(equipment?.stockQuantity ?? 0));
  const [status, setStatus] = useState<EquipmentStatus>(equipment?.status ?? "ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const stockQuantity = Number(stock);
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setError("Stock must be a whole number of 0 or more");
      return;
    }

    const body: EquipmentInput = { name, category, stockQuantity, status };
    setError(null);
    setSubmitting(true);
    try {
      await api<Equipment>(
        isEdit ? `/admin/equipment/${equipment.id}` : "/admin/equipment",
        { method: isEdit ? "PATCH" : "POST", json: body },
      );
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit equipment" : "Add equipment"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Category</span>
          <input
            required
            maxLength={50}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Monitor, Keyboard, Mouse"
            className={INPUT_CLASS}
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium">Stock quantity</span>
            <input
              type="number"
              required
              min={0}
              step={1}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
              className={INPUT_CLASS}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {submitting && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
            {isEdit ? "Save changes" : "Add equipment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
