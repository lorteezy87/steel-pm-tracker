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
import { DELIVERY_STATUSES } from "@/lib/pm/constants";
import { filterOpenOnly } from "@/lib/pm/complete";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { Delivery, DeliveryStatus } from "@/lib/pm/types";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/delivery")({ component: DeliveryPage });

function DeliveryPage() {
  const projects = usePmStore((s) => s.projects);
  const deliveries = usePmStore((s) => s.deliveries);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addDelivery);
  const update = usePmStore((s) => s.updateDelivery);
  const del = usePmStore((s) => s.deleteDelivery);
  const [showCompleted, setShowCompleted] = useState(false);
  const all = filterByProject(deliveries, filter);
  const rows = filterOpenOnly(all, showCompleted);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "loadNumber", label: "Load / truck #", type: "text", required: true },
      { key: "pieceMarks", label: "Work packages", type: "text", required: true, placeholder: "WP-01, WP-02" },
      { key: "plannedShip", label: "Planned ship", type: "date" },
      { key: "actualShip", label: "Actual ship", type: "date" },
      { key: "plannedArrival", label: "Planned arrival", type: "date" },
      { key: "actualArrival", label: "Actual arrival", type: "date" },
      { key: "status", label: "Status", type: "select", options: DELIVERY_STATUSES },
      { key: "destination", label: "Destination", type: "text" },
      { key: "owner", label: "Owner", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [projects],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) return { ...editing } as Record<string, string | number>;
    return {
      projectId: defaultProjectId(projects, filter),
      loadNumber: "",
      pieceMarks: "",
      plannedShip: "",
      actualShip: "",
      plannedArrival: "",
      actualArrival: "",
      status: "Scheduled",
      destination: "",
      owner: "",
      notes: "",
    };
  }, [dialog, editing, projects, filter]);

  return (
    <AppShell
      title="Delivery"
      subtitle="Loads · check done to clear"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={filterOpenOnly(all, false).length}
            totalCount={all.length}
          />
          <ProjectFilter />
          <AddButton label="Add load" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th>Project</Th>
              <Th>Load / Truck</Th>
              <Th>Work Packages</Th>
              <Th>Plan Ship</Th>
              <Th>Act Ship</Th>
              <Th>Plan Arr</Th>
              <Th>Act Arr</Th>
              <Th>Status</Th>
              <Th>Destination</Th>
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
                      markEntityComplete(usePmStore.getState(), "delivery", r.id)
                    }
                    onReopen={() =>
                      reopenEntity(usePmStore.getState(), "delivery", r.id)
                    }
                  />
                </Td>
                <Td className="tabular font-medium">{projectCode(projects, r.projectId)}</Td>
                <Td className="font-mono text-xs">{r.loadNumber}</Td>
                <Td className="max-w-[10rem] truncate font-medium">{r.pieceMarks}</Td>
                <Td className="tabular">{formatDate(r.plannedShip)}</Td>
                <Td className="tabular text-muted">{formatDate(r.actualShip)}</Td>
                <Td className="tabular">{formatDate(r.plannedArrival)}</Td>
                <Td className="tabular text-muted">{formatDate(r.actualArrival)}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td>{r.destination}</Td>
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
            {all.length === 0 ? "No deliveries." : "All open loads complete. Toggle Show completed."}
          </div>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit delivery" : "Add delivery"}
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
            loadNumber: String(v.loadNumber),
            pieceMarks: String(v.pieceMarks),
            plannedShip: String(v.plannedShip),
            actualShip: String(v.actualShip),
            plannedArrival: String(v.plannedArrival),
            actualArrival: String(v.actualArrival),
            status: v.status as DeliveryStatus,
            destination: String(v.destination),
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
        title="Delete delivery?"
        message="Remove this load from the tracker?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
