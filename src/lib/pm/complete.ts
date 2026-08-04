/** Shared complete / done logic for every tracker list. */

export function isDoneStatus(status: string): boolean {
  const s = status.toLowerCase();
  return (
    s === "complete" ||
    s === "approved" ||
    s === "approved as noted" ||
    s === "closed" ||
    s === "answered" ||
    s === "verified" ||
    s === "delivered" ||
    s === "implemented" ||
    s === "ready to ship" ||
    s === "cancelled"
  );
}

export function filterOpenOnly<T extends { status: string }>(
  rows: T[],
  showCompleted: boolean,
): T[] {
  if (showCompleted) return rows;
  return rows.filter((r) => !isDoneStatus(r.status));
}
