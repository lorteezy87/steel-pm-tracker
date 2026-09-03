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
import { WORK_PACKAGE_STATUSES } from "@/lib/pm/constants";
import { filterOpenOnly } from "@/lib/pm/complete";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { WorkPackage, WorkPackageStatus } from "@/lib/pm/types";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/work-packages")({ component: WorkPackagesPage });

function WorkPackagesPage() {
  const projects = usePmStore((s) => s.projects);
  const workPackages = usePmStore((s) => s.workPackages);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addWorkPackage);
  const update = usePmStore((s) => s.updateWorkPackage);
  const del = usePmStore((s) => s.deleteWorkPackage);
  const [showCompleted, setShowCompleted] = useState(false);
  const all = filterByProject(workPackages, filter);
  const rows = filterOpenOnly(all, showCompleted);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<WorkPackage | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "code", label: "Code", type: "text", required: true, placeholder: "WP-01" },
      { key: "name", label: "Name", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "status", label: "Status", type: "select", options: WORK_PACKAGE_STATUSES },
      { key: "plannedStart", label: "Planned start", type: "date" },
      { key: "plannedComplete", label: "Planned complete", type: "date" },
      { key: "tonnage", label: "Tonnage", type: "number" },
      { key: "owner", label: "Owner", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [projects],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) return { ...editing } as Record<string, string | number>;
    return {
      projectId: defaultProjectId(projects, filter),
      code: "",
      name: "",
      description: "",
      status: "Planned",
      plannedStart: "",
      plannedComplete: "",
      tonnage: 0,
      owner: "",
      notes: "",
    };
  }, [dialog, editing, projects, filter]);

  return (
    <AppShell
      title="Work Packages"
      subtitle="Discrete scopes of work · parent for Fab/Delivery/Install"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={filterOpenOnly(all, false).length}
            totalCount={all.length}
          />
          <ProjectFilter />
          <AddButton label="Add Work Package" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th>Project</Th>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Planned Start</Th>
              <Th>Planned Complete</Th>
              <Th>Tonnage</Th>
              <Th>Owner</Th>
              <Th className="w-20">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((wp) => (
              <tr key={wp.id} className="hover:bg-surface-2/50">
                <Td>
                  <CompleteCheck
                    status={wp.status}
                    onComplete={() =>
                      markEntityComplete(usePmStore.getState(), "workPackage", wp.id)
                    }
                    onReopen={() => reopenEntity(usePmStore.getState(), "workPackage", wp.id)}
                  />
                </Td>
                <Td className="tabular font-medium">{projectCode(projects, wp.projectId)}</Td>
                <Td className="font-mono text-xs font-semibold">{wp.code}</Td>
                <Td className="max-w-[14rem]">{wp.name}</Td>
                <Td>
                  <StatusBadge status={wp.status} />
                </Td>
                <Td className="tabular">{formatDate(wp.plannedStart)}</Td>
                <Td className="tabular">{formatDate(wp.plannedComplete)}</Td>
                <Td className="tabular">{wp.tonnage}</Td>
                <Td>{wp.owner}</Td>
                <Td>
                  <RowActions
                    onEdit={() => {
                      setEditing(wp);
                      setDialog("edit");
                    }}
                    onDelete={() => setDeleteId(wp.id)}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        {rows.length === 0 && (
          <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            {all.length === 0 ? "No work packages." : "All open work packages complete. Toggle Show completed."}
          </div>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit work package" : "Add work package"}
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
            code: String(v.code),
            name: String(v.name),
            description: String(v.description),
            status: v.status as WorkPackageStatus,
            plannedStart: String(v.plannedStart),
            plannedComplete: String(v.plannedComplete),
            tonnage: Number(v.tonnage) || 0,
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
        title="Delete work package?"
        message="Removes the work package. Fab/Delivery/Install rows that reference it are unlinked, not deleted."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
