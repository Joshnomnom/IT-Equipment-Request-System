const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** e.g. "15 Oct 2026, 13:45" */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** Request reference shown to users, e.g. "REQ-000012". */
export function requestRef(id: number): string {
  return `REQ-${String(id).padStart(6, "0")}`;
}
