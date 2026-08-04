import { CompleteCheck } from "@/components/complete-check";
import { isDoneStatus } from "@/lib/pm/complete";
import { markEntityComplete } from "@/lib/pm/mark-complete";
import { DEMO_TODAY, usePmStore } from "@/lib/pm/store";
import type { LookaheadItem } from "@/lib/pm/types";
import { formatDate } from "@/lib/utils";
import { DataTable, Td, Th } from "./data-table";
import { StatusBadge } from "./ui/status-badge";

export function LookaheadTable({ items }: { items: LookaheadItem[] }) {
  const openItems = items.filter((i) => !isDoneStatus(i.status));

  if (openItems.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-12 text-center text-sm text-muted">
        No open items due in this window.
      </div>
    );
  }

  return (
    <DataTable>
      <thead>
        <tr>
          <Th className="w-10">Done</Th>
          <Th>Project</Th>
          <Th>Tracker</Th>
          <Th>ID</Th>
          <Th>Description</Th>
          <Th>Owner</Th>
          <Th>Due</Th>
          <Th>Status</Th>
          <Th>Priority</Th>
          <Th>Action</Th>
        </tr>
      </thead>
      <tbody>
        {openItems.map((row, i) => {
          const overdue = row.due < DEMO_TODAY;
          return (
            <tr
              key={`${row.entityType}-${row.entityId}-${row.due}-${i}`}
              className={overdue ? "bg-status-red/5" : "hover:bg-surface-2/60"}
            >
              <Td>
                <CompleteCheck
                  status={row.status}
                  onComplete={() =>
                    markEntityComplete(usePmStore.getState(), row.entityType, row.entityId)
                  }
                  label={`Complete ${row.id}`}
                />
              </Td>
              <Td className="font-medium tabular">{row.projectCode}</Td>
              <Td className="text-muted">{row.tracker}</Td>
              <Td className="font-mono text-xs">{row.id}</Td>
              <Td className="max-w-[14rem] truncate">{row.description}</Td>
              <Td>{row.owner}</Td>
              <Td className={overdue ? "font-semibold text-status-red" : "tabular"}>
                {formatDate(row.due)}
              </Td>
              <Td>
                <StatusBadge status={row.status} />
              </Td>
              <Td>
                <StatusBadge status={row.priority} />
              </Td>
              <Td className="text-muted">{row.action}</Td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}
