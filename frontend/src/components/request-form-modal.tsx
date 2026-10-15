"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/lib/api";
import { requestRef } from "@/lib/format";
import type { Equipment } from "@/types/equipment";
import type {
  CreateRequestInput,
  Requisition,
  UpdateRequestInput,
} from "@/types/request";
import { Modal } from "./modal";
import { buttonStyles } from "./page-layout";
import { Spinner } from "./spinner";

const INPUT_CLASS =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
const REASON_MAX = 500;

type RequestableEquipment = Pick<Equipment, "id" | "name" | "category" | "stockQuantity">;

/**
 * New request for `equipment`, or edit of `existing` (a PENDING request).
 * Employees edit their pending request instead of filing a second one.
 */
export function RequestFormModal({
  equipment,
  existing,
  onClose,
  onSaved,
}: {
  equipment: RequestableEquipment;
  existing?: Requisition;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const isEdit = existing !== undefined;
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? 1));
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      setError("Quantity must be a whole number of at least 1");
      return;
    }
    if (qty > equipment.stockQuantity) {
      setError(`Only ${equipment.stockQuantity} in stock`);
      return;
    }
    if (reason.trim() === "") {
      setError("Please give a reason for this request");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        const body: UpdateRequestInput = { quantity: qty, reason };
        await api<Requisition>(`/requests/${existing.id}`, { method: "PATCH", json: body });
        onSaved(`${requestRef(existing.id)} has been updated.`);
      } else {
        const body: CreateRequestInput = { equipmentId: equipment.id, quantity: qty, reason };
        const created = await api<Requisition>("/requests", { method: "POST", json: body });
        onSaved(`${requestRef(created.id)} has been submitted and is awaiting approval.`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the request");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEdit ? `Edit request ${requestRef(existing.id)}` : "New equipment request"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <dl className="grid grid-cols-3 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Equipment</dt>
            <dd className="font-medium text-slate-900">{equipment.name}</dd>
            <dd className="text-xs text-slate-500">{equipment.category}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">In stock</dt>
            <dd className="font-medium tabular-nums text-slate-900">{equipment.stockQuantity}</dd>
          </div>
        </dl>

        <label className="block">
          <span className="text-sm font-medium">Quantity</span>
          <input
            type="number"
            required
            min={1}
            max={equipment.stockQuantity}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={INPUT_CLASS}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">
            Reason <span className="text-red-600">*</span>
          </span>
          <textarea
            required
            rows={4}
            maxLength={REASON_MAX}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Second monitor for design work"
            className={INPUT_CLASS}
          />
          <span className="mt-1 block text-right text-xs text-slate-400">
            {reason.length}/{REASON_MAX}
          </span>
        </label>

        {!isEdit && (
          <p className="text-xs text-slate-500">
            Stock is reserved only when an administrator approves the request.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={buttonStyles.secondary}>
            Cancel
          </button>
          <button type="submit" disabled={submitting} className={buttonStyles.primary}>
            {submitting && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
            {isEdit ? "Save changes" : "Submit request"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
