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
import { FAB_STATUSES } from "@/lib/pm/constants";
import { filterOpenOnly } from "@/lib/pm/complete";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { FabItem, FabStatus } from "@/lib/pm/types";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/fabrication")({ component: FabPage });

function FabPage() {
  const projects = usePmStore((s) => s.projects);
  const fab = usePmStore((s) => s.fab);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addFab);
  const update = usePmStore((s) => s.updateFab);
  const del = usePmStore((s) => s.deleteFab);
  const [showCompleted, setShowCompleted] = useState(false);
  const all = filterByProject(fab, filter);
  const rows = filterOpenOnly(all, showCompleted);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<FabItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "workPackage", label: "Work package", type: "text", required: true, placeholder: "WP-01 Columns" },
      { key: "description", label: "Description", type: "text" },
      { key: "qty", label: "Qty", type: "number" },
      { key: "weightTons", label: "Weight (tons)", type: "number" },
      { key: "drawingRef", label: "Drawing ref", type: "text" },
      { key: "status", label: "Status", type: "select", options: FAB_STATUSES },
      { key: "pctComplete", label: "% complete", type: "number" },
      { key: "shop", label: "Shop", type: "text" },
      { key: "plannedDate", label: "Planned date", type: "date" },
      { key: "owner", label: "Owner", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [projects],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) return { ...editing } as Record<string, string | number>;
    return {
      projectId: defaultProjectId(projects, filter),
      workPackage: "",
      description: "",
      qty: 0,
      weightTons: 0,
      drawingRef: "",
      status: "Released",
      pctComplete: 0,
      shop: "",
      plannedDate: "",
      owner: "",
      notes: "",
    };
  }, [dialog, editing, projects, filter]);

  return (
    <AppShell
      title="Fabrication"
      subtitle="Work packages · check done to clear"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={filterOpenOnly(all, false).length}
            totalCount={all.length}
          />
          <ProjectFilter />
          <AddButton label="Add WP" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th>Project</Th>
              <Th>Work Package</Th>
              <Th>Description</Th>
              <Th>Qty</Th>
              <Th>Weight (t)</Th>
              <Th>Drawing</Th>
              <Th>Status</Th>
              <Th>%</Th>
              <Th>Shop</Th>
              <Th>Planned</Th>
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
                      markEntityComplete(usePmStore.getState(), "fab", r.id)
                    }
                    onReopen={() => reopenEntity(usePmStore.getState(), "fab", r.id)}
                  />
                </Td>
                <Td className="tabular font-medium">{projectCode(projects, r.projectId)}</Td>
                <Td className="font-semibold text-primary">{r.workPackage}</Td>
                <Td className="max-w-[12rem] text-muted">{r.description}</Td>
                <Td className="tabular">{r.qty}</Td>
                <Td className="tabular">{r.weightTons}</Td>
                <Td className="font-mono text-xs">{r.drawingRef}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td className="tabular">{r.pctComplete}%</Td>
                <Td>{r.shop}</Td>
                <Td className="tabular">{formatDate(r.plannedDate)}</Td>
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
              ? "No work packages."
              : "All open work packages complete. Toggle Show completed."}
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
            workPackage: String(v.workPackage),
            description: String(v.description),
            qty: Number(v.qty) || 0,
            weightTons: Number(v.weightTons) || 0,
            drawingRef: String(v.drawingRef),
            status: v.status as FabStatus,
            pctComplete: Math.min(100, Math.max(0, Number(v.pctComplete) || 0)),
            shop: String(v.shop),
            plannedDate: String(v.plannedDate),
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
        message="Remove this fabrication work package?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
