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
import { INSTALL_STATUSES } from "@/lib/pm/constants";
import { filterOpenOnly } from "@/lib/pm/complete";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { InstallItem, InstallStatus } from "@/lib/pm/types";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/installation")({ component: InstallPage });

function InstallPage() {
  const projects = usePmStore((s) => s.projects);
  const install = usePmStore((s) => s.install);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addInstall);
  const update = usePmStore((s) => s.updateInstall);
  const del = usePmStore((s) => s.deleteInstall);
  const [showCompleted, setShowCompleted] = useState(false);
  const all = filterByProject(install, filter);
  const rows = filterOpenOnly(all, showCompleted);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<InstallItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "sequenceArea", label: "Sequence / area", type: "text", required: true },
      { key: "pieceMarks", label: "Work package", type: "text", required: true },
      { key: "plannedErect", label: "Planned erect", type: "date" },
      { key: "status", label: "Status", type: "select", options: INSTALL_STATUSES },
      { key: "pctComplete", label: "% complete", type: "number" },
      { key: "crew", label: "Crew", type: "text" },
      { key: "owner", label: "Owner", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [projects],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) return { ...editing } as Record<string, string | number>;
    return {
      projectId: defaultProjectId(projects, filter),
      sequenceArea: "",
      pieceMarks: "",
      plannedErect: "",
      status: "On Site",
      pctComplete: 0,
      crew: "",
      owner: "",
      notes: "",
    };
  }, [dialog, editing, projects, filter]);

  return (
    <AppShell
      title="Installation"
      subtitle="Sequences · check done to clear"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={filterOpenOnly(all, false).length}
            totalCount={all.length}
          />
          <ProjectFilter />
          <AddButton label="Add sequence" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th>Project</Th>
              <Th>Sequence / Area</Th>
              <Th>Work Package</Th>
              <Th>Planned Erect</Th>
              <Th>Status</Th>
              <Th>%</Th>
              <Th>Crew</Th>
              <Th>Owner</Th>
              <Th className="w-20">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-surface-2/50">
                <Td>
                  <CompleteCheck
                    status={r.status}
                    onComplete={() =>
                      markEntityComplete(usePmStore.getState(), "install", r.id)
                    }
                    onReopen={() =>
                      reopenEntity(usePmStore.getState(), "install", r.id)
                    }
                  />
                </Td>
                <Td className="tabular font-medium">{projectCode(projects, r.projectId)}</Td>
                <Td>{r.sequenceArea}</Td>
                <Td className="font-medium text-primary">{r.pieceMarks}</Td>
                <Td className="tabular">{formatDate(r.plannedErect)}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td className="tabular">{r.pctComplete}%</Td>
                <Td>{r.crew}</Td>
                <Td>{r.owner}</Td>
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
            ))}
          </tbody>
        </DataTable>
        {rows.length === 0 && (
          <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            {all.length === 0
              ? "No installation sequences."
              : "All open sequences complete. Toggle Show completed."}
          </div>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit sequence" : "Add sequence"}
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
            sequenceArea: String(v.sequenceArea),
            pieceMarks: String(v.pieceMarks),
            plannedErect: String(v.plannedErect),
            status: v.status as InstallStatus,
            pctComplete: Math.min(100, Math.max(0, Number(v.pctComplete) || 0)),
            crew: String(v.crew),
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
        title="Delete sequence?"
        message="Remove this installation sequence?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
