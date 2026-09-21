import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ItemRow } from "@/components/item-row";
import { ProjectFilter } from "@/components/project-filter";
import { buildAllOpen, filterSmartList, SMART_LISTS, type SmartListId } from "@/lib/pm/smart-lists";
import { projectCode, usePmStore } from "@/lib/pm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/smart-lists")({ component: SmartListsPage });

function SmartListsPage() {
  const state = usePmStore();
  const filter = state.filterProjectId;
  const [selected, setSelected] = useState<SmartListId>("overdue");

  const open = useMemo(() => {
    const all = buildAllOpen(state);
    if (filter === "all") return all;
    const code = projectCode(state.projects, filter);
    return all.filter((i) => i.projectCode === code);
  }, [state, filter]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        SMART_LISTS.map((l) => [l.id, filterSmartList(open, l.id).length]),
      ) as Record<SmartListId, number>,
    [open],
  );

  const active = SMART_LISTS.find((l) => l.id === selected)!;
  const items = filterSmartList(open, selected);

  return (
    <AppShell
      title="Smart Lists"
      subtitle="Derived from the trackers — nothing to maintain by hand"
      actions={<ProjectFilter />}
    >
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[10px] font-semibold tracking-[0.14em] text-subtle uppercase">
            <Sparkles className="size-3.5" /> Smart Lists
          </div>
          {SMART_LISTS.map((l) => {
            const count = counts[l.id];
            const isActive = l.id === selected;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelected(l.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 border-b border-border/70 px-3 py-2.5 text-left transition-colors last:border-b-0",
                  isActive ? "bg-primary/15" : "hover:bg-surface-2",
                )}
              >
                <Sparkles
                  className={cn(
                    "size-3.5 shrink-0",
                    l.tone === "red"
                      ? "text-status-red"
                      : l.tone === "yellow"
                        ? "text-status-yellow"
                        : isActive
                          ? "text-primary"
                          : "text-muted",
                  )}
                  strokeWidth={1.75}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-sm font-medium",
                      isActive ? "text-primary" : "text-fg",
                    )}
                  >
                    {l.label}
                  </span>
                  <span className="block truncate text-xs text-subtle">{l.hint}</span>
                </span>
                <span
                  className={cn(
                    "tabular shrink-0 rounded-full px-1.5 py-px text-[10px] font-bold",
                    l.tone === "red" && count > 0
                      ? "bg-status-red/20 text-status-red"
                      : "bg-surface-3 text-muted",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </aside>

        <section className="min-w-0 rounded-xl border border-border bg-surface">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{active.label}</h2>
              <p className="truncate text-xs text-muted">{active.hint}</p>
            </div>
            <span className="tabular shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-semibold text-muted">
              {items.length}
            </span>
          </header>
          {items.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-subtle">
              Nothing in this list.
            </p>
          ) : (
            <ul className="divide-y divide-border/60 px-2 py-1">
              {items.map((item) => (
                <ItemRow key={`${item.entityType}-${item.entityId}`} item={item} showTracker />
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
