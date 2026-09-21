import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Flame, Inbox, NotebookPen } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DayStrip } from "@/components/day-strip";
import { ProjectFilter } from "@/components/project-filter";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildCalendarEvents, trackerColor } from "@/lib/pm/calendar-events";
import { isDoneStatus } from "@/lib/pm/complete";
import {
  addDaysIso,
  buildDayPlan,
  DAY_PERIODS,
  formatClock,
  formatLongDate,
  type DayBlock,
  type DayPeriod,
} from "@/lib/pm/day-plan";
import { CompleteCheck } from "@/components/complete-check";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { rescheduleEntity } from "@/lib/pm/reschedule";
import { buildLookahead, DEMO_TODAY, projectCode, usePmStore } from "@/lib/pm/store";
import type { LookaheadItem } from "@/lib/pm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: DailyPage });

function DailyPage() {
  const state = usePmStore();
  const [date, setDate] = useState(DEMO_TODAY);
  const filter = state.filterProjectId;

  const events = useMemo(() => buildCalendarEvents(state), [state]);
  const scoped = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.projectId === filter)),
    [events, filter],
  );
  const blocks = useMemo(() => buildDayPlan(scoped, date), [scoped, date]);

  // "Past due" is everything with a driving date before the selected day that
  // is still open — the pile that quietly rolls forward if nobody pushes it.
  const pastDue = useMemo(() => {
    const all = buildLookahead(state, addDaysIso(date, -1));
    const open = all.filter((i) => i.due < date && !isDoneStatus(i.status));
    return filter === "all"
      ? open
      : open.filter((i) => i.projectCode === projectCode(state.projects, filter));
  }, [state, date, filter]);

  const journalToday = useMemo(
    () =>
      state.journal.filter(
        (j) => j.entryDate === date && (filter === "all" || j.projectId === filter),
      ),
    [state.journal, date, filter],
  );

  const { day, month, weekday } = formatLongDate(date);
  const byPeriod = (p: DayPeriod) => blocks.filter((b) => b.period === p);

  return (
    <AppShell
      title="Today"
      subtitle="The day as it will actually be worked"
      actions={<ProjectFilter />}
    >
      <div className="mx-auto max-w-7xl pb-16">
        <header className="mb-5 flex items-baseline justify-center gap-3">
          <span className="text-5xl font-light tabular text-fg">{day}</span>
          <div className="leading-tight">
            <div className="text-xs font-semibold tracking-[0.16em] text-muted">
              {month}
            </div>
            <div className="text-lg font-semibold text-accent-steel">{weekday}</div>
          </div>
        </header>

        {/* min-w-0 on both tracks: a grid item defaults to min-width:auto, so a
            long row (a block's title + badges, a past-due card) widened the
            column past the viewport and scrolled the whole page sideways. */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <section className="min-w-0 space-y-5">
            {DAY_PERIODS.map((period) => {
              const rows = byPeriod(period);
              return (
                <div key={period}>
                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="text-xs font-semibold tracking-[0.14em] text-accent-steel uppercase">
                      {period}
                    </h2>
                    <div className="h-px flex-1 bg-border" />
                    <span className="tabular text-xs text-subtle">{rows.length}</span>
                  </div>
                  {rows.length === 0 ? (
                    <p className="px-1 py-2 text-sm text-subtle">
                      Nothing scheduled this {period.toLowerCase()}.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {rows.map((b) => (
                        <BlockRow key={b.event.id} block={b} />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>

          <aside className="min-w-0 space-y-5">
            <PastDuePanel
              items={pastDue}
              date={date}
              onPush={(item) =>
                rescheduleEntity(
                  usePmStore.getState(),
                  item.entityType,
                  item.entityId,
                  addDaysIso(date, 1),
                )
              }
              onPushAll={() => {
                const store = usePmStore.getState();
                const tomorrow = addDaysIso(date, 1);
                for (const item of pastDue) {
                  rescheduleEntity(store, item.entityType, item.entityId, tomorrow);
                }
              }}
            />

            <Panel title="Field journal" icon={NotebookPen}>
              {journalToday.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-subtle">No entry logged for this day.</p>
                  <Link
                    to="/journal"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Write today&apos;s entry <ArrowRight className="size-3" />
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {journalToday.map((j) => (
                    <li key={j.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <span className="tabular text-xs font-semibold text-accent-steel">
                          {projectCode(state.projects, j.projectId)}
                        </span>
                        <span className="text-xs text-muted">
                          {j.crewCount} crew · {j.manhours} mhr · {j.tonsErected}t
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-muted">{j.workPerformed}</p>
                      {j.delays ? (
                        <p className="mt-0.5 text-xs text-status-red">Delay: {j.delays}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Waiting on us" icon={Inbox}>
              <BallInCourtList date={date} />
            </Panel>
          </aside>
        </div>

        <DayStrip value={date} onChange={setDate} />
      </div>
    </AppShell>
  );
}

function BlockRow({ block }: { block: DayBlock }) {
  const { event } = block;
  const done = isDoneStatus(event.status);
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong hover:bg-surface-2">
      <span className="tabular w-14 shrink-0 pt-0.5 text-xs font-semibold text-muted">
        {formatClock(block.start)}
      </span>
      <div className="shrink-0 pt-0.5">
        <CompleteCheck
          status={event.status}
          onComplete={() =>
            markEntityComplete(usePmStore.getState(), event.entityType, event.entityId)
          }
          onReopen={() =>
            reopenEntity(usePmStore.getState(), event.entityType, event.entityId)
          }
        />
      </div>
      <Link to={event.href} className="min-w-0 flex-1 overflow-hidden">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              done ? "text-muted line-through" : "text-fg",
            )}
          >
            {event.title}
          </span>
          <span
            className={cn(
              "rounded border px-1.5 py-px text-[10px] font-semibold",
              trackerColor(event.tracker),
            )}
          >
            {event.tracker}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {event.projectCode} · {event.subtitle}
        </span>
      </Link>
      <StatusBadge status={event.status} />
    </li>
  );
}

function PastDuePanel({
  items,
  date,
  onPush,
  onPushAll,
}: {
  items: LookaheadItem[];
  date: string;
  onPush: (item: LookaheadItem) => void;
  onPushAll: () => void;
}) {
  if (items.length === 0) {
    return (
      <Panel title="Past due" icon={Flame}>
        <p className="text-sm text-subtle">Nothing overdue. Clean board.</p>
      </Panel>
    );
  }
  return (
    <Panel title="Past due" icon={Flame} count={items.length} tone="red">
      <ul className="space-y-1.5">
        {items.slice(0, 12).map((item) => (
          <li
            key={`${item.entityType}-${item.entityId}`}
            className="rounded-lg border border-status-red/25 bg-status-red/5 px-2.5 py-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-fg">
                  {item.id} · {item.description}
                </div>
                <div className="tabular mt-0.5 text-xs text-status-red">
                  {item.projectCode} · due {item.due} · {item.tracker}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPush(item)}
                title={`Push to ${addDaysIso(date, 1)}`}
                className="shrink-0 rounded px-1.5 py-1 text-xs font-semibold text-primary hover:bg-surface-3"
              >
                +1d
              </button>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 12 ? (
        <p className="mt-2 text-xs text-subtle">+{items.length - 12} more</p>
      ) : null}
      <button
        type="button"
        onClick={onPushAll}
        className="mt-3 flex w-full items-center justify-between rounded-md bg-surface-3 px-3 py-2 text-xs font-semibold text-primary hover:bg-border-strong"
      >
        Push all {items.length} to tomorrow
        <ArrowRight className="size-3.5" />
      </button>
    </Panel>
  );
}

/**
 * Open review-cycle items whose ball is in OUR court — the list to clear before
 * chasing anyone else for a response.
 */
function BallInCourtList({ date }: { date: string }) {
  const state = usePmStore();
  const filter = state.filterProjectId;
  const ours = (v: string) => v.trim().toLowerCase() === "us";
  const inScope = (projectId: string) => filter === "all" || projectId === filter;

  const rows = [
    ...state.submittals
      .filter(
        (s) =>
          inScope(s.projectId) &&
          ours(s.ballInCourt) &&
          s.status !== "Approved" &&
          s.status !== "Approved as Noted",
      )
      .map((s) => ({
        key: `sb-${s.id}`,
        href: "/submittals" as const,
        label: `${s.submittalNumber} · ${s.type}`,
        due: s.dueBack,
        status: s.status,
      })),
    ...state.rfis
      .filter((r) => inScope(r.projectId) && ours(r.ballInCourt) && r.status === "Open")
      .map((r) => ({
        key: `rfi-${r.id}`,
        href: "/rfis" as const,
        label: `${r.rfiNumber} · ${r.subject}`,
        due: r.responseDue,
        status: r.status,
      })),
    ...state.drawingSets
      .filter((d) => inScope(d.projectId) && ours(d.ballInCourt) && !isDoneStatus(d.status))
      .map((d) => ({
        key: `ds-${d.id}`,
        href: "/drawings" as const,
        label: `${d.name} · ${d.type}`,
        due: d.requiredBy,
        status: d.status,
      })),
  ].sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));

  if (rows.length === 0) {
    return <p className="text-sm text-subtle">Nothing sitting on us right now.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {rows.slice(0, 10).map((r) => (
        <li key={r.key}>
          <Link
            to={r.href}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-fg">{r.label}</span>
            <span
              className={cn(
                "tabular shrink-0 text-xs",
                r.due && r.due < date ? "font-semibold text-status-red" : "text-muted",
              )}
            >
              {r.due || "—"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Panel({
  title,
  icon: Icon,
  count,
  tone,
  children,
}: {
  title: string;
  icon: typeof AlertTriangle;
  count?: number;
  tone?: "red";
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon
          className={cn("size-4", tone === "red" ? "text-status-red" : "text-accent-steel")}
          strokeWidth={1.75}
        />
        <h2 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">
          {title}
        </h2>
        {count !== undefined ? (
          <span
            className={cn(
              "tabular rounded-full px-1.5 py-px text-[10px] font-bold",
              tone === "red"
                ? "bg-status-red/20 text-status-red"
                : "bg-surface-3 text-muted",
            )}
          >
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
