import type { RequestStatus } from "@/types/request";
import { Badge, type BadgeTone } from "./badge";

const STATUS: Record<RequestStatus, { tone: BadgeTone; label: string }> = {
  PENDING: { tone: "yellow", label: "Pending" },
  APPROVED: { tone: "green", label: "Approved" },
  REJECTED: { tone: "red", label: "Rejected" },
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const { tone, label } = STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
