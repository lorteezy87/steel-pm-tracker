import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CompleteCheck } from "@/components/complete-check";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  TRACKER_FILTERS,
  buildCalendarEvents,
  monthMatrix,
  toIsoDate,
  trackerColor,
  type CalendarEvent,
} from "@/lib/pm/calendar-events";
import { isDoneStatus } from "@/lib/pm/complete";
import { markEntityComplete } from "@/lib/pm/mark-complete";
import { DEMO_TODAY, usePmStore } from "@/lib/pm/store";
import type { TrackerName } from "@/lib/pm/types";
import { cn, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({ component: CalendarPage });

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarPage() {
  const projects = usePmStore((s) => s.projects);
  const drawingSets = usePmStore((s) => s.drawingSets);
  const drawingSheets = usePmStore((s) => s.drawingSheets);
  const fab = usePmStore((s) => s.fab);
  const deliveries = usePmStore((s) => s.deliveries);
  const install = usePmStore((s) => s.install);
  const rfis = usePmStore((s) => s.rfis);
  const cos = usePmStore((s) => s.cos);
  const tasks = usePmStore((s) => s.tasks);

  const allEvents = useMemo(
    () =>
      buildCalendarEvents({
        projects,
        drawingSets,
        drawingSheets,
        fab,
        deliveries,
        install,
        rfis,
        cos,
        tasks,
      }),
    [
      projects,
      drawingSets,
      drawingSheets,
      fab,
      deliveries,
      install,
      rfis,
      cos,
      tasks,
    ],
  );

  const demo = new Date(DEMO_TODAY + "T12:00:00");
  const [cursor, setCursor] = useState(
    () => new Date(demo.getFullYear(), demo.getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState<string>(DEMO_TODAY);

  const [projectId, setProjectId] = useState<string | "all">("all");
  const [trackers, setTrackers] = useState<Set<TrackerName>>(
    () => new Set(TRACKER_FILTERS),
  );
  const [ownerQuery, setOwnerQuery] = useState("");
  const [statusQuery, setStatusQuery] = useState("");

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = useMemo(() => monthMatrix(year, month), [year, month]);
  const monthLabel = cursor.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const filtered = useMemo(() => {
    const oq = ownerQuery.trim().toLowerCase();
    const sq = statusQuery.trim().toLowerCase();
    return allEvents.filter((e) => {
      if (projectId !== "all" && e.projectId !== projectId) return false;
      if (!trackers.has(e.tracker)) return false;
      if (oq && !e.owner.toLowerCase().includes(oq)) return false;
      if (sq && !e.status.toLowerCase().includes(sq)) return false;
      if (isDoneStatus(e.status)) return false;
      return true;
    });
  }, [allEvents, projectId, trackers, ownerQuery, statusQuery]);

  const byDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of filtered) {
      const list = m.get(e.date) ?? [];
      list.push(e);
      m.set(e.date, list);
    }
    return m;
  }, [filtered]);

  const dayEvents = byDate.get(selectedDay) ?? [];
  const monthEvents = filtered.filter((e) => e.date.startsWith(monthKey));

  function toggleTracker(t: TrackerName) {
    setTrackers((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function markComplete(e: CalendarEvent) {
    markEntityComplete(usePmStore.getState(), e.entityType, e.entityId);
  }

  function completeAllDay() {
    for (const e of dayEvents) markComplete(e);
  }

  return (
    <AppShell
      title="Activity Calendar"
      subtitle="To-do list by day — check complete to clear items"
      actions={
        <button
          type="button"
          className="h-9 rounded-md border border-border bg-surface-2 px-3 text-xs font-medium text-fg hover:border-primary/40"
          onClick={() => {
            setCursor(new Date(demo.getFullYear(), demo.getMonth(), 1));
            setSelectedDay(DEMO_TODAY);
          }}
        >
          Today (demo)
        </button>
      }
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row">
        <aside className="w-full shrink-0 space-y-4 rounded-xl border border-border bg-surface p-4 lg:w-64">
          <div>
            <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
              Project
            </div>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface-2 px-2 text-sm text-fg outline-none focus:border-primary"
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                Trackers
              </span>
              <span className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setTrackers(new Set(TRACKER_FILTERS))}
                >
                  All
                </button>
                <button
                  type="button"
                  className="text-muted hover:underline"
                  onClick={() => setTrackers(new Set())}
                >
                  None
                </button>
              </span>
            </div>
            <div className="space-y-1.5">
              {TRACKER_FILTERS.map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-surface-2"
                >
                  <input
                    type="checkbox"
                    checked={trackers.has(t)}
                    onChange={() => toggleTracker(t)}
                    className="size-3.5 accent-[var(--color-primary)]"
                  />
                  <span
                    className={cn(
                      "truncate",
                      trackers.has(t) ? "text-fg" : "text-muted",
                    )}
                  >
                    {t}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
              Owner contains
            </div>
            <input
              value={ownerQuery}
              onChange={(e) => setOwnerQuery(e.target.value)}
              placeholder="SE, Shop, Nick…"
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
              Status contains
            </div>
            <input
              value={statusQuery}
              onChange={(e) => setStatusQuery(e.target.value)}
              placeholder="Open, Scheduled…"
              className="mt-1.5 h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
            />
          </div>

          <p className="text-xs leading-relaxed text-muted">
            Check an item to mark it complete in its tracker. Completed items
            leave this list automatically.
          </p>

          <div className="rounded-md border border-border bg-surface-2/50 px-3 py-2 text-xs text-muted">
            <span className="tabular font-semibold text-fg">{monthEvents.length}</span>{" "}
            open this month
            <span className="mx-1 text-subtle">·</span>
            <span className="tabular font-semibold text-fg">{filtered.length}</span>{" "}
            matching filters
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2">
            <button
              type="button"
              className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="text-base font-semibold tracking-tight">{monthLabel}</h2>
            <button
              type="button"
              className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="grid grid-cols-7 border-b border-border bg-surface-2">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-1 py-2 text-center text-[11px] font-semibold tracking-wide text-muted uppercase"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {weeks.map((week, wi) =>
                week.map((day, di) => {
                  if (!day) {
                    return (
                      <div
                        key={`e-${wi}-${di}`}
                        className="min-h-[88px] border-b border-r border-border/50 bg-bg/40 sm:min-h-[110px]"
                      />
                    );
                  }
                  const iso = toIsoDate(day);
                  const list = byDate.get(iso) ?? [];
                  const isSelected = iso === selectedDay;
                  const isToday = iso === DEMO_TODAY;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedDay(iso)}
                      className={cn(
                        "min-h-[88px] border-b border-r border-border/50 p-1 text-left align-top transition-colors sm:min-h-[110px] sm:p-1.5",
                        isSelected ? "bg-primary/10" : "hover:bg-surface-2/60",
                        isToday && !isSelected && "bg-surface-2/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={cn(
                            "inline-flex size-6 items-center justify-center rounded-full text-xs tabular",
                            isToday
                              ? "bg-primary font-semibold text-primary-fg"
                              : "text-muted",
                            isSelected && !isToday && "font-semibold text-primary",
                          )}
                        >
                          {day.getDate()}
                        </span>
                        {list.length > 0 ? (
                          <span className="text-[10px] tabular text-muted">
                            {list.length}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {list.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className={cn(
                              "truncate rounded-sm border px-1 py-0.5 text-[10px] leading-tight",
                              trackerColor(e.tracker),
                            )}
                            title={`${e.projectCode} · ${e.title}`}
                          >
                            <span className="font-medium">{e.projectCode}</span>{" "}
                            {e.title}
                          </div>
                        ))}
                        {list.length > 3 ? (
                          <div className="text-[10px] text-muted">
                            +{list.length - 3} more
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                }),
              )}
            </div>
          </div>

          <section className="rounded-xl border border-border bg-surface">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">
                To-do · {formatDate(selectedDay)} · {dayEvents.length} open
              </h3>
              {dayEvents.length > 0 ? (
                <button
                  type="button"
                  onClick={completeAllDay}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 text-xs font-medium text-fg hover:border-primary/40 hover:bg-surface-3"
                >
                  <Check className="size-3.5 text-status-green" />
                  Complete all
                </button>
              ) : null}
            </div>
            {dayEvents.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted">
                No open to-dos for this day. Pick another date or loosen filters.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {dayEvents.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 px-4 py-3 sm:items-center"
                  >
                    <CompleteCheck
                      status={e.status}
                      onComplete={() => markComplete(e)}
                      label={`Mark complete: ${e.title}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-sm border px-1.5 py-0.5 text-[10px] font-medium",
                            trackerColor(e.tracker),
                          )}
                        >
                          {e.tracker}
                        </span>
                        <span className="text-xs text-muted">{e.kind}</span>
                        <span className="font-mono text-xs text-primary">
                          {e.projectCode}
                        </span>
                      </div>
                      <div className="mt-1 font-medium text-fg">{e.title}</div>
                      <div className="text-xs text-muted">{e.subtitle}</div>
                      <div className="mt-1 text-xs text-subtle">
                        Owner: {e.owner || "—"}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                      <StatusBadge status={e.status} />
                      <Link
                        to={e.href}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
