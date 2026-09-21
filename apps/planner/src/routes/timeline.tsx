import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { DayStrip } from "@/components/day-strip";
import { ProjectFilter } from "@/components/project-filter";
import { buildCalendarEvents, trackerColor } from "@/lib/pm/calendar-events";
import { isDoneStatus } from "@/lib/pm/complete";
import {
  buildDayPlan,
  DAY_END,
  DAY_START,
  formatClock,
  formatDuration,
  formatLongDate,
  freeGaps,
} from "@/lib/pm/day-plan";
import { DEMO_TODAY, usePmStore } from "@/lib/pm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/timeline")({ component: TimelinePage });

/** Pixels per minute — 56px per hour keeps a full workday on one screen. */
const PX_PER_MIN = 56 / 60;

function y(minutes: number): number {
  return (minutes - DAY_START) * PX_PER_MIN;
}

function TimelinePage() {
  const state = usePmStore();
  const [date, setDate] = useState(DEMO_TODAY);
  const filter = state.filterProjectId;

  const events = useMemo(() => buildCalendarEvents(state), [state]);
  const scoped = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.projectId === filter)),
    [events, filter],
  );
  const blocks = useMemo(() => buildDayPlan(scoped, date), [scoped, date]);
  const gaps = useMemo(() => freeGaps(blocks), [blocks]);

  const hours = Array.from(
    { length: Math.ceil((DAY_END - DAY_START) / 60) + 1 },
    (_, i) => DAY_START + i * 60,
  );
  const gridHeight = y(DAY_END);
  const { day, month, weekday } = formatLongDate(date);

  return (
    <AppShell
      title="Timeline"
      subtitle="Where the day is actually booked — and where it isn't"
      actions={<ProjectFilter />}
    >
      <div className="mx-auto max-w-5xl pb-16">
        <header className="mb-5 flex items-baseline justify-center gap-3">
          <span className="text-5xl font-light tabular text-fg">{day}</span>
          <div className="leading-tight">
            <div className="text-xs font-semibold tracking-[0.16em] text-muted">{month}</div>
            <div className="text-lg font-semibold text-accent-steel">{weekday}</div>
          </div>
        </header>

        <div className="rounded-xl border border-border bg-surface p-3 md:p-4">
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((m) => (
              <div
                key={m}
                className="absolute inset-x-0 flex items-start gap-2"
                style={{ top: y(m) }}
              >
                <span className="tabular w-10 shrink-0 -translate-y-2 text-right text-xs text-subtle">
                  {formatClock(m).replace(":00", "")}
                </span>
                <span className="mt-px h-px flex-1 bg-border/70" />
              </div>
            ))}

            {gaps.map((gap) => (
              <div
                key={`gap-${gap.start}`}
                className="absolute left-12 flex items-center"
                style={{ top: y(gap.start), height: (gap.end - gap.start) * PX_PER_MIN }}
              >
                <span className="rounded-full border border-border bg-surface-2/80 px-2.5 py-0.5 text-[11px] text-muted">
                  {formatDuration(gap.end - gap.start)} free
                </span>
              </div>
            ))}

            {blocks.map((b) => {
              const done = isDoneStatus(b.event.status);
              const widthPct = 100 / b.laneCount;
              return (
                <Link
                  key={b.event.id}
                  to={b.event.href}
                  className={cn(
                    "absolute overflow-hidden rounded-lg border px-2.5 py-1.5 transition-opacity hover:opacity-90",
                    trackerColor(b.event.tracker),
                    done && "opacity-60",
                  )}
                  style={{
                    top: y(b.start) + 1,
                    height: Math.max((b.end - b.start) * PX_PER_MIN - 3, 22),
                    left: `calc(3rem + (100% - 3rem) * ${b.lane / b.laneCount})`,
                    width: `calc((100% - 3rem) * ${widthPct / 100} - 4px)`,
                  }}
                >
                  <div
                    className={cn(
                      "truncate text-xs font-semibold",
                      done && "line-through",
                    )}
                  >
                    {b.event.title}
                  </div>
                  <div className="truncate text-[11px] opacity-80">
                    {formatClock(b.start)}–{formatClock(b.end)} · {b.event.projectCode}
                  </div>
                  {b.end - b.start >= 90 ? (
                    <div className="mt-0.5 truncate text-[11px] opacity-70">
                      {b.event.subtitle}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {blocks.length === 0 && (
            <p className="py-6 text-center text-sm text-subtle">
              Nothing scheduled on this date.
            </p>
          )}
        </div>

        <DayStrip value={date} onChange={setDate} />
      </div>
    </AppShell>
  );
}
