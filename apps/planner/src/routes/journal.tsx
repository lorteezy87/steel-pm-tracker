import { createFileRoute } from "@tanstack/react-router";
import { Check, CloudSun, HardHat, Plus, Timer, Weight } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDelete, CrudDialog, type FormFieldDef } from "@/components/crud-dialog";
import { defaultProjectId, projectField } from "@/components/project-select-field";
import { ProjectFilter } from "@/components/project-filter";
import { AddButton, RowActions } from "@/components/row-actions";
import { TagPicker } from "@/components/tag-picker";
import { buildCalendarEvents } from "@/lib/pm/calendar-events";
import { isDoneStatus } from "@/lib/pm/complete";
import { formatLongDate } from "@/lib/pm/day-plan";
import { DEMO_TODAY, filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { JournalEntry, Note } from "@/lib/pm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/journal")({ component: JournalPage });

/**
 * The day's record, three layers deep:
 *   1. the structured field log (crew, man-hours, tons, delays) — the numbers a
 *      delay claim is built from;
 *   2. timestamped moments (dated notes) — what you jotted as it happened;
 *   3. what actually closed that day, rolled up.
 */
interface JournalDay {
  date: string;
  entries: JournalEntry[];
  moments: Note[];
  completed: number;
}

function JournalPage() {
  const state = usePmStore();
  const projects = state.projects;
  const filter = state.filterProjectId;
  const addNote = usePmStore((s) => s.addNote);
  const add = usePmStore((s) => s.addJournalEntry);
  const update = usePmStore((s) => s.updateJournalEntry);
  const del = usePmStore((s) => s.deleteJournalEntry);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [composerDate, setComposerDate] = useState(DEMO_TODAY);
  const [visibleDays, setVisibleDays] = useState(12);

  const entries = useMemo(
    () => filterByProject(state.journal, filter),
    [state.journal, filter],
  );
  const moments = useMemo(
    () =>
      state.notes.filter(
        (n) =>
          n.noteDate && (filter === "all" || n.projectId === filter || !n.projectId),
      ),
    [state.notes, filter],
  );

  const days = useMemo<JournalDay[]>(() => {
    const events = buildCalendarEvents(state).filter(
      (e) => filter === "all" || e.projectId === filter,
    );
    const completedByDate = new Map<string, number>();
    for (const e of events) {
      if (!isDoneStatus(e.status)) continue;
      completedByDate.set(e.date, (completedByDate.get(e.date) ?? 0) + 1);
    }

    const dates = new Set<string>([
      DEMO_TODAY,
      ...entries.map((e) => e.entryDate),
      ...moments.map((m) => m.noteDate),
      ...completedByDate.keys(),
    ]);

    return [...dates]
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        entries: entries.filter((e) => e.entryDate === date),
        moments: moments
          .filter((m) => m.noteDate === date)
          .sort((a, b) => (a.noteTime || "").localeCompare(b.noteTime || "")),
        completed: completedByDate.get(date) ?? 0,
      }))
      .filter((d) => d.entries.length || d.moments.length || d.completed || d.date === DEMO_TODAY);
  }, [state, entries, moments, filter]);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({
          manhours: acc.manhours + (e.manhours || 0),
          tons: acc.tons + (e.tonsErected || 0),
          days: acc.days + 1,
          delayDays: acc.delayDays + (e.delays.trim() ? 1 : 0),
        }),
        { manhours: 0, tons: 0, days: 0, delayDays: 0 },
      ),
    [entries],
  );

  function postMoment(date: string) {
    const text = composer.trim();
    if (!text) return;
    const [first, ...rest] = text.split("\n");
    const now = new Date();
    addNote({
      projectId: filter === "all" ? "" : filter,
      noteDate: date,
      noteTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      title: first,
      body: rest.join("\n"),
      pinned: false,
      triaged: true,
      author: "",
    });
    setComposer("");
  }

  const fields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "entryDate", label: "Date", type: "date", required: true },
      { key: "weather", label: "Weather", type: "text", placeholder: "Clear, light wind" },
      { key: "tempHigh", label: "High temp (°F)", type: "number" },
      { key: "crewCount", label: "Crew count", type: "number" },
      { key: "manhours", label: "Man-hours", type: "number" },
      { key: "tonsErected", label: "Tons erected", type: "number" },
      { key: "workPerformed", label: "Work performed", type: "textarea" },
      {
        key: "delays",
        label: "Delays / impacts",
        type: "textarea",
        placeholder: "Crane down 2.5 hrs — lightning hold",
      },
      { key: "deliveriesReceived", label: "Deliveries received", type: "textarea" },
      { key: "visitors", label: "Visitors / inspections", type: "text" },
      { key: "safetyNotes", label: "Safety notes", type: "textarea" },
      { key: "author", label: "Logged by", type: "text" },
    ],
    [projects],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) return { ...editing } as Record<string, string | number>;
    return {
      projectId: defaultProjectId(projects, filter),
      entryDate: composerDate,
      weather: "",
      tempHigh: 0,
      crewCount: 0,
      manhours: 0,
      tonsErected: 0,
      workPerformed: "",
      delays: "",
      deliveriesReceived: "",
      visitors: "",
      safetyNotes: "",
      author: "",
    };
  }, [dialog, editing, projects, filter, composerDate]);

  return (
    <AppShell
      title="Journal"
      subtitle="Daily erection log — the record behind every delay claim and time-impact CO"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ProjectFilter />
          <AddButton label="Log the day" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-5 pb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 [&>*]:min-w-0">
          <Stat icon={HardHat} label="Days logged" value={String(totals.days)} />
          <Stat icon={Timer} label="Man-hours" value={totals.manhours.toLocaleString()} />
          <Stat icon={Weight} label="Tons erected" value={totals.tons.toFixed(1)} />
          <Stat
            icon={CloudSun}
            label="Days with delays"
            value={String(totals.delayDays)}
            tone={totals.delayDays > 0 ? "red" : undefined}
          />
        </div>

        <div className="divide-y divide-border">
          {days.slice(0, visibleDays).map((day) => {
            const { day: dayNum, month, weekday } = formatLongDate(day.date);
            const isToday = day.date === DEMO_TODAY;
            return (
              <div key={day.date} className="grid gap-4 py-5 sm:grid-cols-[9rem_minmax(0,1fr)] [&>*]:min-w-0">
                <div className="sm:text-right">
                  <div className="flex items-baseline gap-2 sm:justify-end">
                    <span
                      className={cn(
                        "text-4xl font-light tabular",
                        isToday ? "text-primary" : "text-fg",
                      )}
                    >
                      {dayNum}
                    </span>
                    <div className="leading-tight sm:text-left">
                      <div className="text-[10px] font-semibold tracking-wider text-subtle">
                        {month}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-semibold",
                          isToday ? "text-primary" : "text-muted",
                        )}
                      >
                        {weekday}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setComposerDate(day.date);
                      setDialog("add");
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider text-subtle uppercase hover:text-primary"
                  >
                    Add <Plus className="size-3" />
                  </button>
                </div>

                <div className="min-w-0 space-y-2.5 border-l border-border pl-4">
                  {day.entries.map((e) => (
                    <FieldLog
                      key={e.id}
                      entry={e}
                      projectLabel={projectCode(projects, e.projectId)}
                      onEdit={() => {
                        setEditing(e);
                        setDialog("edit");
                      }}
                      onDelete={() => setDeleteId(e.id)}
                    />
                  ))}

                  {day.moments.map((m) => (
                    <div key={m.id} className="flex gap-3">
                      <span className="tabular w-14 shrink-0 pt-0.5 text-right text-[11px] text-subtle">
                        {m.noteTime || "—"}
                      </span>
                      <div className="min-w-0 flex-1 border-b border-dashed border-border/70 pb-2">
                        <div className="text-sm text-fg">{m.title}</div>
                        {m.body ? (
                          <p className="mt-0.5 text-sm whitespace-pre-wrap text-muted">
                            {m.body}
                          </p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {m.projectId ? (
                            <span className="text-[10px] font-semibold text-accent-steel">
                              {projectCode(projects, m.projectId)}
                            </span>
                          ) : null}
                          <TagPicker entityType="note" entityId={m.id} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {day.completed > 0 && (
                    <div className="flex items-center gap-2 border-b border-dashed border-border/70 pb-2 text-xs text-muted">
                      <Check className="size-3.5 text-status-green" />
                      <span className="font-semibold tracking-wide uppercase">
                        {day.completed} completed
                      </span>
                    </div>
                  )}

                  {isToday ? (
                    <div className="pt-1">
                      <textarea
                        value={composerDate === day.date ? composer : ""}
                        onFocus={() => setComposerDate(day.date)}
                        onChange={(e) => {
                          setComposerDate(day.date);
                          setComposer(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            postMoment(day.date);
                          }
                        }}
                        rows={2}
                        placeholder="Add a moment from today…"
                        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none placeholder:text-subtle focus:border-primary"
                      />
                      {composerDate === day.date && composer.trim() ? (
                        <button
                          type="button"
                          onClick={() => postMoment(day.date)}
                          className="mt-1.5 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-fg"
                        >
                          Post moment
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    day.entries.length === 0 &&
                    day.moments.length === 0 &&
                    day.completed === 0 && (
                      <p className="text-sm text-subtle">Nothing logged.</p>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {days.length > visibleDays && (
          <button
            type="button"
            onClick={() => setVisibleDays((n) => n + 12)}
            className="w-full rounded-xl border border-dashed border-border-strong py-3 text-xs font-semibold tracking-wider text-muted uppercase hover:border-primary hover:text-primary"
          >
            Continue browsing · {days.length - visibleDays} earlier days
          </button>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit field log" : "Log the day"}
        fields={fields}
        initial={initial}
        submitLabel={dialog === "edit" ? "Save changes" : "Log entry"}
        onClose={() => {
          setDialog(null);
          setEditing(null);
        }}
        onSubmit={(v) => {
          const row = {
            projectId: String(v.projectId),
            entryDate: String(v.entryDate),
            weather: String(v.weather),
            tempHigh: Number(v.tempHigh) || 0,
            crewCount: Number(v.crewCount) || 0,
            manhours: Number(v.manhours) || 0,
            tonsErected: Number(v.tonsErected) || 0,
            workPerformed: String(v.workPerformed),
            delays: String(v.delays),
            deliveriesReceived: String(v.deliveriesReceived),
            visitors: String(v.visitors),
            safetyNotes: String(v.safetyNotes),
            author: String(v.author),
          };
          if (dialog === "edit" && editing) update(editing.id, row);
          else add(row);
          setDialog(null);
          setEditing(null);
        }}
      />
      <ConfirmDelete
        open={!!deleteId}
        title="Delete field log?"
        message="This removes the daily record for that date."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}

function FieldLog({
  entry: e,
  projectLabel,
  onEdit,
  onDelete,
}: {
  entry: JournalEntry;
  projectLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-accent-steel/30 bg-accent-steel/15 px-1.5 py-px text-[10px] font-semibold text-accent-steel">
              {projectLabel}
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-subtle uppercase">
              Field log
            </span>
          </div>
          <div className="mt-1 text-xs text-muted">
            {[
              e.weather,
              e.tempHigh ? `${e.tempHigh}°F` : "",
              e.crewCount ? `${e.crewCount} crew` : "",
              e.manhours ? `${e.manhours} mhr` : "",
              e.tonsErected ? `${e.tonsErected}t set` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="mt-2.5 space-y-2 text-sm">
        {e.workPerformed ? <Field label="Work performed">{e.workPerformed}</Field> : null}
        {e.delays ? (
          <Field label="Delays / impacts" tone="red">
            {e.delays}
          </Field>
        ) : null}
        {e.deliveriesReceived ? (
          <Field label="Deliveries received">{e.deliveriesReceived}</Field>
        ) : null}
        {e.visitors ? <Field label="Visitors">{e.visitors}</Field> : null}
        {e.safetyNotes ? <Field label="Safety">{e.safetyNotes}</Field> : null}
      </div>

      {e.author ? (
        <div className="mt-2.5 border-t border-border/70 pt-2 text-xs text-subtle">
          Logged by {e.author}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  tone,
  children,
}: {
  label: string;
  tone?: "red";
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={cn(
          "text-[10px] font-semibold tracking-wider uppercase",
          tone === "red" ? "text-status-red" : "text-subtle",
        )}
      >
        {label}
      </div>
      <p className={cn("text-sm", tone === "red" ? "text-status-red" : "text-muted")}>
        {children}
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof HardHat;
  label: string;
  value: string;
  tone?: "red";
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-subtle uppercase">
        <Icon className="size-3.5" strokeWidth={1.75} />
        {label}
      </div>
      <div
        className={cn(
          "tabular mt-1 text-xl font-semibold",
          tone === "red" ? "text-status-red" : "text-fg",
        )}
      >
        {value}
      </div>
    </div>
  );
}
