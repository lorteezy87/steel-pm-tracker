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
import { CO_STATUSES } from "@/lib/pm/constants";
import { filterOpenOnly } from "@/lib/pm/complete";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { ChangeOrder, CoStatus } from "@/lib/pm/types";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/changes")({ component: ChangesPage });

function ChangesPage() {
  const projects = usePmStore((s) => s.projects);
  const cos = usePmStore((s) => s.cos);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addCo);
  const update = usePmStore((s) => s.updateCo);
  const del = usePmStore((s) => s.deleteCo);
  const [showCompleted, setShowCompleted] = useState(false);
  const all = filterByProject(cos, filter);
  const rows = filterOpenOnly(all, showCompleted);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<ChangeOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "coNumber", label: "CO #", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "linked", label: "Linked RFI / drawing", type: "text" },
      { key: "cost", label: "Cost ($)", type: "number" },
      { key: "scheduleDays", label: "Schedule days", type: "number" },
      { key: "status", label: "Status", type: "select", options: CO_STATUSES },
      { key: "owner", label: "Owner", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [projects],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) return { ...editing } as Record<string, string | number>;
    return {
      projectId: defaultProjectId(projects, filter),
      coNumber: "",
      description: "",
      linked: "",
      cost: 0,
      scheduleDays: 0,
      status: "Draft",
      owner: "",
      notes: "",
    };
  }, [dialog, editing, projects, filter]);

  return (
    <AppShell
      title="Change Orders"
      subtitle="Check done to implement and clear"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={filterOpenOnly(all, false).length}
            totalCount={all.length}
          />
          <ProjectFilter />
          <AddButton label="Add CO" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th>Project</Th>
              <Th>CO #</Th>
              <Th>Description</Th>
              <Th>Linked</Th>
              <Th>Cost</Th>
              <Th>Days</Th>
              <Th>Status</Th>
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
                      markEntityComplete(usePmStore.getState(), "changeOrder", r.id)
                    }
                    onReopen={() =>
                      reopenEntity(usePmStore.getState(), "changeOrder", r.id)
                    }
                  />
                </Td>
                <Td className="tabular font-medium">{projectCode(projects, r.projectId)}</Td>
                <Td className="font-mono text-xs font-semibold">{r.coNumber}</Td>
                <Td className="max-w-[16rem]">{r.description}</Td>
                <Td className="font-mono text-xs text-muted">{r.linked}</Td>
                <Td className="tabular font-medium">{formatCurrency(r.cost)}</Td>
                <Td className="tabular">{r.scheduleDays}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
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
            {all.length === 0 ? "No change orders." : "All open COs done. Toggle Show completed."}
          </div>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit change order" : "Add change order"}
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
            coNumber: String(v.coNumber),
            description: String(v.description),
            linked: String(v.linked),
            cost: Number(v.cost) || 0,
            scheduleDays: Number(v.scheduleDays) || 0,
            status: v.status as CoStatus,
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
        title="Delete change order?"
        message="Remove this CO from the tracker?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
