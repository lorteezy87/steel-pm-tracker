import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CompleteCheck, ShowCompletedToggle } from "@/components/complete-check";
import { ConfirmDelete, CrudDialog, type FormFieldDef } from "@/components/crud-dialog";
import { DataTable, Td, Th } from "@/components/data-table";
import { defaultProjectId, projectField } from "@/components/project-select-field";
import { ProjectFilter } from "@/components/project-filter";
import { AddButton, RowActions } from "@/components/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { BALL_IN_COURT, SUBMITTAL_STATUSES, SUBMITTAL_TYPES } from "@/lib/pm/constants";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { DEMO_TODAY, filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { Submittal, SubmittalStatus, SubmittalType } from "@/lib/pm/types";
import { cn, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/submittals")({ component: SubmittalsPage });

/**
 * A submittal is closed only when it comes back Approved or Approved as Noted.
 * Revise & Resubmit is NOT done — it's back in our court and still holding up
 * release to the shop, so it stays on the open list where it belongs.
 */
function isClosed(s: Submittal): boolean {
  return s.status === "Approved" || s.status === "Approved as Noted";
}

function SubmittalsPage() {
  const projects = usePmStore((s) => s.projects);
  const submittals = usePmStore((s) => s.submittals);
  const drawingSets = usePmStore((s) => s.drawingSets);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addSubmittal);
  const update = usePmStore((s) => s.updateSubmittal);
  const del = usePmStore((s) => s.deleteSubmittal);

  const [showCompleted, setShowCompleted] = useState(false);
  const all = filterByProject(submittals, filter);
  const rows = showCompleted ? all : all.filter((s) => !isClosed(s));

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Submittal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "submittalNumber", label: "Submittal #", type: "text", required: true },
      { key: "type", label: "Package type", type: "select", options: SUBMITTAL_TYPES },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "specSection", label: "Spec section", type: "text", placeholder: "05 12 00" },
      { key: "revision", label: "Revision", type: "text" },
      { key: "submitted", label: "Transmitted", type: "date" },
      { key: "dueBack", label: "Due back", type: "date" },
      { key: "returned", label: "Returned", type: "date" },
      { key: "status", label: "Status", type: "select", options: SUBMITTAL_STATUSES },
      {
        key: "ballInCourt",
        label: "Ball in court",
        type: "select",
        options: [...BALL_IN_COURT],
      },
      {
        key: "linkedDrawingSet",
        label: "Linked drawing set",
        type: "select",
        options: [
          { value: "", label: "— none —" },
          ...drawingSets.map((d) => ({ value: d.name, label: d.name })),
        ],
      },
      { key: "owner", label: "Owner", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [projects, drawingSets],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) return { ...editing } as Record<string, string | number>;
    return {
      projectId: defaultProjectId(projects, filter),
      submittalNumber: "",
      type: "Shop Drawings",
      title: "",
      specSection: "",
      revision: "0",
      submitted: "",
      dueBack: "",
      returned: "",
      status: "Not Submitted",
      ballInCourt: "Us",
      linkedDrawingSet: "",
      owner: "",
      notes: "",
    };
  }, [dialog, editing, projects, filter]);

  const openCount = all.filter((s) => !isClosed(s)).length;
  const rrCount = all.filter((s) => s.status === "Revise & Resubmit").length;

  return (
    <AppShell
      title="Submittals"
      subtitle="Transmittal register — what went out, what's due back, and who's holding it"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={openCount}
            totalCount={all.length}
          />
          <ProjectFilter />
          <AddButton label="Add submittal" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-3">
        {rrCount > 0 && (
          <div className="rounded-lg border border-status-red/30 bg-status-red/10 px-4 py-2.5 text-sm text-status-red">
            <strong>{rrCount}</strong> package{rrCount === 1 ? "" : "s"} came back{" "}
            <strong>Revise &amp; Resubmit</strong> — these are back in our court and
            holding release to the shop.
          </div>
        )}

        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th>Project</Th>
              <Th>Sub #</Th>
              <Th>Type</Th>
              <Th>Title</Th>
              <Th>Spec</Th>
              <Th className="w-12">Rev</Th>
              <Th>Sent</Th>
              <Th>Due Back</Th>
              <Th>Returned</Th>
              <Th>Status</Th>
              <Th>Ball in Court</Th>
              <Th className="w-20">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const overdue = !isClosed(s) && !!s.dueBack && s.dueBack < DEMO_TODAY;
              return (
                <tr
                  key={s.id}
                  className={cn(overdue ? "bg-status-red/5" : "hover:bg-surface-2/50")}
                >
                  <Td>
                    <CompleteCheck
                      status={isClosed(s) ? "Approved" : s.status}
                      onComplete={() =>
                        markEntityComplete(usePmStore.getState(), "submittal", s.id)
                      }
                      onReopen={() =>
                        reopenEntity(usePmStore.getState(), "submittal", s.id)
                      }
                    />
                  </Td>
                  <Td className="tabular font-medium">
                    {projectCode(projects, s.projectId)}
                  </Td>
                  <Td className="font-mono text-xs font-semibold">{s.submittalNumber}</Td>
                  <Td className="text-xs text-muted">{s.type}</Td>
                  <Td className="max-w-[16rem]">{s.title}</Td>
                  <Td className="font-mono text-xs text-muted">{s.specSection}</Td>
                  <Td className="tabular text-center">{s.revision}</Td>
                  <Td className="tabular">{formatDate(s.submitted)}</Td>
                  <Td className={cn("tabular", overdue && "font-semibold text-status-red")}>
                    {formatDate(s.dueBack)}
                  </Td>
                  <Td className="tabular">{formatDate(s.returned)}</Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td>{s.ballInCourt}</Td>
                  <Td>
                    <RowActions
                      onEdit={() => {
                        setEditing(s);
                        setDialog("edit");
                      }}
                      onDelete={() => setDeleteId(s.id)}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
        {rows.length === 0 && (
          <div className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            {all.length === 0
              ? "No submittals yet."
              : "Every submittal is back approved. Toggle Show completed."}
          </div>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit submittal" : "Add submittal"}
        fields={fields}
        initial={initial}
        submitLabel={dialog === "edit" ? "Save changes" : "Create"}
        onClose={() => {
          setDialog(null);
          setEditing(null);
        }}
        onSubmit={(v) => {
          const row = {
            projectId: String(v.projectId),
            submittalNumber: String(v.submittalNumber),
            type: v.type as SubmittalType,
            title: String(v.title),
            specSection: String(v.specSection),
            revision: String(v.revision),
            submitted: String(v.submitted),
            dueBack: String(v.dueBack),
            returned: String(v.returned),
            status: v.status as SubmittalStatus,
            ballInCourt: String(v.ballInCourt),
            linkedDrawingSet: String(v.linkedDrawingSet),
            owner: String(v.owner),
            notes: String(v.notes),
          };
          if (dialog === "edit" && editing) update(editing.id, row);
          else add(row);
          setDialog(null);
          setEditing(null);
        }}
      />
      <ConfirmDelete
        open={!!deleteId}
        title="Delete submittal?"
        message="Remove this submittal from the register?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
