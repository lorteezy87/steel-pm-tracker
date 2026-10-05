import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CompleteCheck, ShowCompletedToggle } from "@/components/complete-check";
import { ConfirmDelete, CrudDialog, type FormFieldDef } from "@/components/crud-dialog";
import { DataTable, Td, Th } from "@/components/data-table";
import { AddButton, RowActions } from "@/components/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { PROJECT_STATUSES } from "@/lib/pm/constants";
import { filterOpenOnly } from "@/lib/pm/complete";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { usePmStore } from "@/lib/pm/store";
import type { Project, ProjectStatus } from "@/lib/pm/types";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/projects")({ component: ProjectsPage });

const FIELDS: FormFieldDef[] = [
  { key: "code", label: "Project code", type: "text", required: true, placeholder: "PHX-2501" },
  { key: "name", label: "Name", type: "text", required: true },
  { key: "client", label: "Client", type: "text", required: true },
  { key: "status", label: "Status", type: "select", options: PROJECT_STATUSES },
  { key: "startDate", label: "Start date", type: "date" },
  { key: "targetComplete", label: "Target complete", type: "date" },
  { key: "owner", label: "PM owner", type: "text" },
  { key: "notes", label: "Notes", type: "textarea" },
];

const empty = (): Record<string, string | number> => ({
  code: "",
  name: "",
  client: "",
  status: "Active",
  startDate: "",
  targetComplete: "",
  owner: "",
  notes: "",
});

function ProjectsPage() {
  const projects = usePmStore((s) => s.projects);
  const add = usePmStore((s) => s.addProject);
  const update = usePmStore((s) => s.updateProject);
  const del = usePmStore((s) => s.deleteProject);
  const [showCompleted, setShowCompleted] = useState(false);
  const rows = filterOpenOnly(projects, showCompleted);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) {
      return {
        code: editing.code,
        name: editing.name,
        client: editing.client,
        status: editing.status,
        startDate: editing.startDate,
        targetComplete: editing.targetComplete,
        owner: editing.owner,
        notes: editing.notes,
      };
    }
    return empty();
  }, [dialog, editing]);

  const deleteTarget = projects.find((p) => p.id === deleteId);

  return (
    <AppShell
      title="Master Projects"
      subtitle="Check complete to clear finished jobs"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={filterOpenOnly(projects, false).length}
            totalCount={projects.length}
          />
          <AddButton label="Add project" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Client</Th>
              <Th>Status</Th>
              <Th>Start</Th>
              <Th>Target</Th>
              <Th>PM</Th>
              <Th>Notes</Th>
              <Th className="w-20">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-surface-2/50">
                <Td>
                  <CompleteCheck
                    status={p.status}
                    onComplete={() =>
                      markEntityComplete(usePmStore.getState(), "project", p.id)
                    }
                    onReopen={() =>
                      reopenEntity(usePmStore.getState(), "project", p.id)
                    }
                  />
                </Td>
                <Td className="font-semibold tabular text-primary">{p.code}</Td>
                <Td className="font-medium">{p.name}</Td>
                <Td className="text-muted">{p.client}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
                <Td className="tabular">{formatDate(p.startDate)}</Td>
                <Td className="tabular">{formatDate(p.targetComplete)}</Td>
                <Td>{p.owner}</Td>
                <Td className="max-w-[12rem] truncate text-muted">{p.notes || "—"}</Td>
                <Td>
                  <RowActions
                    onEdit={() => {
                      setEditing(p);
                      setDialog("edit");
                    }}
                    onDelete={() => setDeleteId(p.id)}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        {rows.length === 0 && (
          <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            {projects.length === 0
              ? "Add a project to get started."
              : "All projects complete. Toggle Show completed."}
          </div>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit project" : "Add project"}
        fields={FIELDS}
        initial={initial}
        submitLabel={dialog === "edit" ? "Save changes" : "Create"}
        onClose={() => {
          setDialog(null);
          setEditing(null);
        }}
        onSubmit={(v) => {
          const row = {
            code: String(v.code),
            name: String(v.name),
            client: String(v.client),
            status: v.status as ProjectStatus,
            startDate: String(v.startDate),
            targetComplete: String(v.targetComplete),
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
        title="Delete project?"
        message={`Delete ${deleteTarget?.code ?? "this project"} and all linked tracker rows? This cannot be undone.`}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
