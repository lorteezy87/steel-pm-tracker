import { CompleteCheck } from "@/components/complete-check";
import { TagPicker } from "@/components/tag-picker";
import { StatusBadge } from "@/components/ui/status-badge";
import { trackerColor } from "@/lib/pm/calendar-events";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { DEMO_TODAY, usePmStore } from "@/lib/pm/store";
import type { LookaheadItem } from "@/lib/pm/types";
import { cn } from "@/lib/utils";

/**
 * One open item, as it appears in Lists and Smart Lists. Tagging lives here
 * rather than in the CRUD dialogs — you tag things while reading the board.
 */
export function ItemRow({
  item,
  showTracker,
}: {
  item: LookaheadItem;
  showTracker?: boolean;
}) {
  const overdue = !!item.due && item.due < DEMO_TODAY;
  return (
    <li className="flex items-start gap-3 rounded-md px-1 py-1.5 hover:bg-surface-2">
      <div className="pt-0.5">
        <CompleteCheck
          status={item.status}
          onComplete={() =>
            markEntityComplete(usePmStore.getState(), item.entityType, item.entityId)
          }
          onReopen={() =>
            reopenEntity(usePmStore.getState(), item.entityType, item.entityId)
          }
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-fg">
          <span className="font-medium">{item.id}</span>
          <span className="text-muted"> · {item.description}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          {showTracker ? (
            <span
              className={cn(
                "rounded border px-1.5 py-px text-[10px] font-semibold",
                trackerColor(item.tracker),
              )}
            >
              {item.tracker}
            </span>
          ) : null}
          <span className="tabular font-semibold text-accent-steel">
            {item.projectCode}
          </span>
          <span
            className={cn(
              "tabular",
              overdue ? "font-semibold text-status-red" : "text-muted",
            )}
          >
            {item.due || "no date"}
          </span>
          <span className="text-subtle">{item.action}</span>
          {item.owner ? <span className="text-subtle">· {item.owner}</span> : null}
          <TagPicker entityType={item.entityType} entityId={item.entityId} />
        </div>
      </div>
      <StatusBadge status={item.status} />
    </li>
  );
}
