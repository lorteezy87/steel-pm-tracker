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
import { RFI_STATUSES } from "@/lib/pm/constants";
import { filterOpenOnly } from "@/lib/pm/complete";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { DEMO_TODAY, filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { Rfi, RfiStatus } from "@/lib/pm/types";
import { cn, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/rfis")({ component: RfisPage });

function RfisPage() {
  const projects = usePmStore((s) => s.projects);
  const rfis = usePmStore((s) => s.rfis);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addRfi);
  const update = usePmStore((s) => s.updateRfi);
  const del = usePmStore((s) => s.deleteRfi);
  const [showCompleted, setShowCompleted] = useState(false);
  const all = filterByProject(rfis, filter);
  const rows = filterOpenOnly(all, showCompleted);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Rfi | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "rfiNumber", label: "RFI #", type: "text", required: true },
      { key: "subject", label: "Subject", type: "text", required: true },
      { key: "issued", label: "Issued", type: "date" },
      { key: "responseDue", label: "Response due", type: "date" },
      { key: "status", label: "Status", type: "select", options: RFI_STATUSES },
      { key: "ballInCourt", label: "Ball in court", type: "text" },
      { key: "impact", label: "Cost / schedule impact", type: "text" },
      { key: "linkedDrawing", label: "Linked drawing", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [projects],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) return { ...editing } as Record<string, string | number>;
    return {
      projectId: defaultProjectId(projects, filter),
      rfiNumber: "",
      subject: "",
      issued: "",
      responseDue: "",
      status: "Open",
      ballInCourt: "",
      impact: "",
      linkedDrawing: "",
      notes: "",
    };
  }, [dialog, editing, projects, filter]);

  return (
    <AppShell
      title="RFIs"
      subtitle="Check done to close and clear"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={filterOpenOnly(all, false).length}
            totalCount={all.length}
          />
          <ProjectFilter />
          <AddButton label="Add RFI" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th>Project</Th>
              <Th>RFI #</Th>
              <Th>Subject</Th>
              <Th>Issued</Th>
              <Th>Response Due</Th>
              <Th>Status</Th>
              <Th>Ball in Court</Th>
              <Th>Impact</Th>
              <Th>Drawing</Th>
              <Th className="w-20">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const overdue = r.status === "Open" && r.responseDue < DEMO_TODAY;
              return (
                <tr
                  key={r.id}
                  className={cn(overdue ? "bg-status-red/5" : "hover:bg-surface-2/50")}
                >
                  <Td>
                    <CompleteCheck
                      status={r.status}
                      onComplete={() =>
                        markEntityComplete(usePmStore.getState(), "rfi", r.id)
                      }
                      onReopen={() => reopenEntity(usePmStore.getState(), "rfi", r.id)}
                    />
                  </Td>
                  <Td className="tabular font-medium">{projectCode(projects, r.projectId)}</Td>
                  <Td className="font-mono text-xs font-semibold">{r.rfiNumber}</Td>
                  <Td className="max-w-[14rem]">{r.subject}</Td>
                  <Td className="tabular">{formatDate(r.issued)}</Td>
                  <Td className={cn("tabular", overdue && "font-semibold text-status-red")}>
                    {formatDate(r.responseDue)}
                  </Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td>{r.ballInCourt}</Td>
                  <Td className="max-w-[10rem] text-muted">{r.impact}</Td>
                  <Td className="font-mono text-xs">{r.linkedDrawing}</Td>
                  <Td>
                    <RowActions
                      onEdit={() => {
                        setEditing(r);
                        setDialog("edit");
                      }}
                      onDelete={() => setDeleteId(r.id)}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
        {rows.length === 0 && (
          <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            {all.length === 0 ? "No RFIs." : "All open RFIs closed. Toggle Show completed."}
          </div>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit RFI" : "Add RFI"}
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
            rfiNumber: String(v.rfiNumber),
            subject: String(v.subject),
            issued: String(v.issued),
            responseDue: String(v.responseDue),
            status: v.status as RfiStatus,
            ballInCourt: String(v.ballInCourt),
            impact: String(v.impact),
            linkedDrawing: String(v.linkedDrawing),
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
        title="Delete RFI?"
        message="Remove this RFI from the tracker?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
