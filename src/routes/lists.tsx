import { createFileRoute } from "@tanstack/react-router";
import { Building2, Flame, Inbox, ListTree, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CompleteCheck } from "@/components/complete-check";
import { StatusBadge } from "@/components/ui/status-badge";
import { isDoneStatus } from "@/lib/pm/complete";
import { trackerColor } from "@/lib/pm/calendar-events";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { buildLookahead, DEMO_TODAY, usePmStore } from "@/lib/pm/store";
import type { LookaheadItem, TrackerName } from "@/lib/pm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lists")({ component: ListsPage });

/** Far-future horizon: Lists is "everything open", not a lookahead window. */
const ALL_TIME = "2099-12-31";

type ListId =
  | { kind: "outstanding" }
  | { kind: "overdue" }
  | { kind: "ours" }
  | { kind: "project"; projectId: string };

function keyOf(id: ListId): string {
  return id.kind === "project" ? `project:${id.projectId}` : id.kind;
}

function ListsPage() {
  const state = usePmStore();
  const [selected, setSelected] = useState<ListId>({ kind: "outstanding" });

  const open = useMemo(
    () => buildLookahead(state, ALL_TIME).filter((i) => !isDoneStatus(i.status)),
    [state],
  );

  const overdue = useMemo(
    () => open.filter((i) => i.due && i.due < DEMO_TODAY),
    [open],
  );

  // "On us" reads the owner column buildLookahead filled from each record's
  // ball-in-court field, so it stays in step with the trackers themselves.
  const ours = useMemo(
    () => open.filter((i) => i.owner.trim().toLowerCase() === "us"),
    [open],
  );

  const byProject = useMemo(() => {
    const map = new Map<string, LookaheadItem[]>();
    for (const p of state.projects) {
      map.set(
        p.id,
        open.filter((i) => i.projectCode === p.code),
      );
    }
    return map;
  }, [open, state.projects]);

  const items =
    selected.kind === "outstanding"
      ? open
      : selected.kind === "overdue"
        ? overdue
        : selected.kind === "ours"
          ? ours
          : (byProject.get(selected.projectId) ?? []);

  const title =
    selected.kind === "outstanding"
      ? "Outstanding"
      : selected.kind === "overdue"
        ? "Overdue"
        : selected.kind === "ours"
          ? "Ball in our court"
          : (state.projects.find((p) => p.id === selected.projectId)?.name ?? "Project");

  return (
    <AppShell title="Lists" subtitle="Every open item, sliced the way you work it">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <aside className="space-y-4">
          <nav className="overflow-hidden rounded-xl border border-border bg-surface">
            <RailItem
              icon={Inbox}
              label="Outstanding"
              count={open.length}
              active={keyOf(selected) === "outstanding"}
              onClick={() => setSelected({ kind: "outstanding" })}
            />
            <RailItem
              icon={Flame}
              label="Overdue"
              count={overdue.length}
              tone="red"
              active={keyOf(selected) === "overdue"}
              onClick={() => setSelected({ kind: "overdue" })}
            />
            <RailItem
              icon={UserCheck}
              label="Ball in our court"
              count={ours.length}
              active={keyOf(selected) === "ours"}
              onClick={() => setSelected({ kind: "ours" })}
            />
          </nav>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[10px] font-semibold tracking-[0.14em] text-subtle uppercase">
              <ListTree className="size-3.5" /> Projects
            </div>
            {state.projects.map((p) => (
              <RailItem
                key={p.id}
                icon={Building2}
                label={p.code}
                sublabel={p.name}
                count={byProject.get(p.id)?.length ?? 0}
                active={keyOf(selected) === `project:${p.id}`}
                onClick={() => setSelected({ kind: "project", projectId: p.id })}
              />
            ))}
            {state.projects.length === 0 && (
              <p className="px-3 py-4 text-sm text-subtle">No projects yet.</p>
            )}
          </div>
        </aside>

        <section className="min-w-0 rounded-xl border border-border bg-surface">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            <span className="tabular shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-muted">
              {items.length}
            </span>
          </header>

          {items.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-subtle">
              Nothing open in this list.
            </p>
          ) : (
            <GroupedItems items={items} />
          )}
        </section>
      </div>
    </AppShell>
  );
}

/** Group a list by tracker so a project view reads as a board, not a flat dump. */
function GroupedItems({ items }: { items: LookaheadItem[] }) {
  const groups = useMemo(() => {
    const map = new Map<TrackerName, LookaheadItem[]>();
    for (const i of items) {
      const list = map.get(i.tracker);
      if (list) list.push(i);
      else map.set(i.tracker, [i]);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="divide-y divide-border">
      {groups.map(([tracker, rows]) => (
        <div key={tracker} className="px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={cn(
                "rounded border px-1.5 py-px text-[10px] font-semibold",
                trackerColor(tracker),
              )}
            >
              {tracker}
            </span>
            <span className="tabular text-xs text-subtle">{rows.length}</span>
          </div>
          <ul className="space-y-1">
            {rows.map((item) => (
              <ItemRow key={`${item.entityType}-${item.entityId}`} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ItemRow({ item }: { item: LookaheadItem }) {
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
          <span className="tabular font-semibold text-accent-steel">
            {item.projectCode}
          </span>
          <span className={cn("tabular", overdue ? "font-semibold text-status-red" : "text-muted")}>
            {item.due || "no date"}
          </span>
          <span className="text-subtle">{item.action}</span>
          {item.owner ? <span className="text-subtle">· {item.owner}</span> : null}
        </div>
      </div>
      <StatusBadge status={item.status} />
    </li>
  );
}

function RailItem({
  icon: Icon,
  label,
  sublabel,
  count,
  active,
  tone,
  onClick,
}: {
  icon: typeof Inbox;
  label: string;
  sublabel?: string;
  count: number;
  active: boolean;
  tone?: "red";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 border-b border-border/70 px-3 py-2.5 text-left transition-colors last:border-b-0",
        active ? "bg-primary/15" : "hover:bg-surface-2",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          tone === "red" ? "text-status-red" : active ? "text-primary" : "text-muted",
        )}
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-sm font-medium",
            active ? "text-primary" : "text-fg",
          )}
        >
          {label}
        </span>
        {sublabel ? (
          <span className="block truncate text-xs text-subtle">{sublabel}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "tabular shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold",
          tone === "red" && count > 0
            ? "bg-status-red/20 text-status-red"
            : "bg-surface-3 text-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}
