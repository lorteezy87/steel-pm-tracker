import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ProjectFilter } from "@/components/project-filter";
import {
  buildCalendarEvents,
  monthMatrix,
  toIsoDate,
  type CalendarEvent,
} from "@/lib/pm/calendar-events";
import { isoWeek } from "@/lib/pm/day-plan";
import { DEMO_TODAY, usePmStore } from "@/lib/pm/store";
import type { TrackerName } from "@/lib/pm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planner")({ component: PlannerPage });

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/**
 * Dot color per tracker on the year grid. Deliberately coarse: at this zoom the
 * only question is "what KIND of pressure is on that week" — detail lives one
 * click down in Timeline/Today.
 */
const DOT: Partial<Record<TrackerName, string>> = {
  Drawings: "bg-status-blue",
  Submittals: "bg-accent-steel",
  Fabrication: "bg-status-yellow",
  Delivery: "bg-primary",
  Installation: "bg-status-green",
  RFIs: "bg-status-red",
  "Change Orders": "bg-status-green",
  Tasks: "bg-status-gray",
};

const LEGEND: TrackerName[] = [
  "Drawings",
  "Submittals",
  "Fabrication",
  "Delivery",
  "Installation",
  "RFIs",
];

function PlannerPage() {
  const state = usePmStore();
  const filter = state.filterProjectId;
  // Start six months out from "today" and let the PM load earlier months on
  // demand, the same way the year grid in the reference app scrolls back.
  const [monthsBefore, setMonthsBefore] = useState(3);
  const [monthsAfter] = useState(11);

  const events = useMemo(() => buildCalendarEvents(state), [state]);
  const scoped = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.projectId === filter)),
    [events, filter],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of scoped) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [scoped]);

  const anchor = new Date(`${DEMO_TODAY}T12:00:00`);
  const months = useMemo(() => {
    const out: { year: number; monthIndex: number }[] = [];
    for (let i = -monthsBefore; i <= monthsAfter; i++) {
      const d = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1);
      out.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthsBefore, monthsAfter]);

  return (
    <AppShell
      title="Planner"
      subtitle="Every dated commitment across every project, by week"
      actions={<ProjectFilter />}
    >
      <div className="mx-auto max-w-[110rem]">
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface px-3 py-2">
          {LEGEND.map((t) => (
            <span key={t} className="flex items-center gap-1.5 text-xs text-muted">
              <span className={cn("size-2 rounded-full", DOT[t])} aria-hidden />
              {t}
            </span>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => setMonthsBefore((n) => n + 6)}
            className="flex h-32 flex-col items-center justify-center gap-2 self-start rounded-xl border border-dashed border-border-strong text-sm font-medium tracking-wide text-muted hover:border-primary hover:text-primary"
          >
            <ChevronUp className="size-5" />
            LOAD 6 EARLIER MONTHS
          </button>

          {months.map(({ year, monthIndex }) => (
            <MonthCard
              key={`${year}-${monthIndex}`}
              year={year}
              monthIndex={monthIndex}
              byDate={byDate}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function MonthCard({
  year,
  monthIndex,
  byDate,
}: {
  year: number;
  monthIndex: number;
  byDate: Map<string, CalendarEvent[]>;
}) {
  const weeks = monthMatrix(year, monthIndex);
  const label = new Date(year, monthIndex, 1)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .toUpperCase();
  const todayIso = DEMO_TODAY;
  const isCurrentMonth = todayIso.startsWith(
    `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
  );

  return (
    <section className="rounded-xl border border-border bg-surface p-3">
      <h2
        className={cn(
          "mb-2 text-sm font-semibold tracking-wide",
          isCurrentMonth ? "text-primary" : "text-fg",
        )}
      >
        {label}
      </h2>
      <div className="grid grid-cols-[1.75rem_repeat(7,minmax(0,1fr))] gap-y-1">
        <span />
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="text-center text-[9px] font-semibold tracking-wider text-subtle"
          >
            {d}
          </span>
        ))}

        {weeks.map((week, wi) => {
          const firstReal = week.find((d): d is Date => d !== null);
          return (
            <WeekRow
              key={wi}
              week={week}
              weekNumber={firstReal ? isoWeek(firstReal) : 0}
              byDate={byDate}
              todayIso={todayIso}
            />
          );
        })}
      </div>
    </section>
  );
}

function WeekRow({
  week,
  weekNumber,
  byDate,
  todayIso,
}: {
  week: (Date | null)[];
  weekNumber: number;
  byDate: Map<string, CalendarEvent[]>;
  todayIso: string;
}) {
  return (
    <>
      <span className="tabular self-center rounded bg-surface-2 py-0.5 text-center text-[9px] font-semibold text-subtle">
        {weekNumber || ""}
      </span>
      {week.map((d, i) => {
        if (!d) return <span key={i} />;
        const iso = toIsoDate(d);
        const events = byDate.get(iso) ?? [];
        // One dot per distinct tracker, capped — past four the cell is noise.
        const trackers = [...new Set(events.map((e) => e.tracker))].slice(0, 4);
        const isToday = iso === todayIso;
        return (
          <Link
            key={iso}
            to="/timeline"
            title={
              events.length
                ? `${iso} — ${events.length} item${events.length === 1 ? "" : "s"}`
                : iso
            }
            className={cn(
              "flex aspect-square flex-col items-center justify-center rounded transition-colors",
              isToday
                ? "bg-primary font-bold text-primary-fg"
                : events.length
                  ? "bg-surface-2 text-fg hover:bg-surface-3"
                  : "text-subtle hover:bg-surface-2",
            )}
          >
            <span className="tabular text-[11px] leading-none">{d.getDate()}</span>
            <span className="mt-0.5 flex h-1 gap-px">
              {trackers.map((t) => (
                <span key={t} className={cn("size-1 rounded-full", DOT[t])} aria-hidden />
              ))}
            </span>
          </Link>
        );
      })}
    </>
  );
}
