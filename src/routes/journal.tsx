import { createFileRoute } from "@tanstack/react-router";
import { CloudSun, HardHat, Timer, Weight } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDelete, CrudDialog, type FormFieldDef } from "@/components/crud-dialog";
import { defaultProjectId, projectField } from "@/components/project-select-field";
import { ProjectFilter } from "@/components/project-filter";
import { AddButton, RowActions } from "@/components/row-actions";
import { DEMO_TODAY, filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { JournalEntry } from "@/lib/pm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/journal")({ component: JournalPage });

function JournalPage() {
  const projects = usePmStore((s) => s.projects);
  const journal = usePmStore((s) => s.journal);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addJournalEntry);
  const update = usePmStore((s) => s.updateJournalEntry);
  const del = usePmStore((s) => s.deleteJournalEntry);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<JournalEntry | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      [...filterByProject(journal, filter)].sort((a, b) =>
        b.entryDate.localeCompare(a.entryDate),
      ),
    [journal, filter],
  );

  // Running totals across whatever is in scope — the numbers a delay claim or
  // a time-impact CO gets built from.
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
      entryDate: DEMO_TODAY,
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
  }, [dialog, editing, projects, filter]);

  return (
    <AppShell
      title="Field Journal"
      subtitle="Daily erection log — the record behind every delay claim and time-impact CO"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ProjectFilter />
          <AddButton label="New entry" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

        {entries.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-muted">
            No journal entries yet. Log the day while it&apos;s fresh.
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="tabular text-sm font-semibold text-fg">
                        {e.entryDate}
                      </span>
                      <span className="rounded border border-accent-steel/30 bg-accent-steel/15 px-1.5 py-px text-[10px] font-semibold text-accent-steel">
                        {projectCode(projects, e.projectId)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted">
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
                  <RowActions
                    onEdit={() => {
                      setEditing(e);
                      setDialog("edit");
                    }}
                    onDelete={() => setDeleteId(e.id)}
                  />
                </div>

                <div className="mt-3 space-y-2 text-sm">
                  {e.workPerformed ? (
                    <Field label="Work performed">{e.workPerformed}</Field>
                  ) : null}
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
                  <div className="mt-3 border-t border-border/70 pt-2 text-xs text-subtle">
                    Logged by {e.author}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit journal entry" : "New journal entry"}
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
        title="Delete journal entry?"
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
