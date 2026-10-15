import type { Equipment } from "./equipment";

export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";

/** A request as returned by /requests/me, with a summary of its equipment. */
export interface Requisition {
  id: number;
  equipmentId: number;
  quantity: number;
  reason: string;
  status: RequestStatus;
  rejectReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  equipment: Pick<Equipment, "id" | "name" | "category" | "stockQuantity" | "status">;
}

export interface CreateRequestInput {
  equipmentId: number;
  quantity: number;
  reason: string;
}

export type UpdateRequestInput = Partial<Omit<CreateRequestInput, "equipmentId">>;
