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

/** A request as returned by /admin/requests, with requester and reviewer. */
export interface AdminRequisition extends Requisition {
  user: { id: number; name: string; email: string };
  reviewedBy: { id: number; name: string } | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminRequestList {
  data: AdminRequisition[];
  meta: PaginationMeta;
  /** Totals per status for the current search (ignores the status filter). */
  counts: Record<RequestStatus, number>;
}

export interface CreateRequestInput {
  equipmentId: number;
  quantity: number;
  reason: string;
}

export type UpdateRequestInput = Partial<Omit<CreateRequestInput, "equipmentId">>;
