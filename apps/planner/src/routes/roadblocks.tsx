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
import { ROADBLOCK_CATEGORIES, ROADBLOCK_IMPACTS, ROADBLOCK_STATUSES, PRIORITIES } from "@/lib/pm/constants";
import { filterOpenOnly } from "@/lib/pm/complete";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { DEMO_TODAY, filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { Priority, Roadblock, RoadblockCategory, RoadblockImpact, RoadblockStatus } from "@/lib/pm/types";
import { cn, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/roadblocks")({ component: RoadblocksPage });

function RoadblocksPage() {
  const projects = usePmStore((s) => s.projects);
  const roadblocks = usePmStore((s) => s.roadblocks);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addRoadblock);
  const update = usePmStore((s) => s.updateRoadblock);
  const del = usePmStore((s) => s.deleteRoadblock);
  const [showCompleted, setShowCompleted] = useState(false);
  const all = filterByProject(roadblocks, filter);
  const rows = filterOpenOnly(all, showCompleted);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Roadblock | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "title", label: "Title", type: "text", required: true },
      { key: "category", label: "Category", type: "select", options: ROADBLOCK_CATEGORIES },
      { key: "description", label: "Description", type: "textarea" },
      { key: "raisedDate", label: "Raised", type: "date" },
      { key: "ballInCourt", label: "Ball in court", type: "text" },
      { key: "impact", label: "Impact", type: "select", options: ROADBLOCK_IMPACTS },
      { key: "severity", label: "Severity", type: "select", options: PRIORITIES },
      { key: "status", label: "Status", type: "select", options: ROADBLOCK_STATUSES },
      { key: "resolvedDate", label: "Target / resolved date", type: "date" },
      {
        key: "linkedEntityType",
        label: "Linked record type (optional)",
        type: "text",
        placeholder: "rfi / changeOrder / drawingSet / workPackage",
      },
      { key: "linkedEntityId", label: "Linked record id (optional)", type: "text" },
      { key: "owner", label: "Owner", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [projects],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) return { ...editing } as Record<string, string | number>;
    return {
      projectId: defaultProjectId(projects, filter),
      title: "",
      category: "Other",
      description: "",
      raisedDate: DEMO_TODAY,
      ballInCourt: "",
      impact: "Other",
      severity: "Med",
      status: "Open",
      resolvedDate: "",
      linkedEntityType: "",
      linkedEntityId: "",
      owner: "",
      notes: "",
    };
  }, [dialog, editing, projects, filter]);

  return (
    <AppShell
      title="Roadblocks"
      subtitle="Anything blocking progress · check done to resolve and clear"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={filterOpenOnly(all, false).length}
            totalCount={all.length}
          />
          <ProjectFilter />
          <AddButton label="Add Roadblock" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th>Project</Th>
              <Th>Title</Th>
              <Th>Category</Th>
              <Th>Ball in Court</Th>
              <Th>Impact</Th>
              <Th>Severity</Th>
              <Th>Status</Th>
              <Th>Target / Resolved</Th>
              <Th>Linked</Th>
              <Th className="w-20">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rb) => {
              const overdue =
                rb.status === "Open" && Boolean(rb.resolvedDate) && rb.resolvedDate < DEMO_TODAY;
              return (
                <tr
                  key={rb.id}
                  className={cn(overdue ? "bg-status-red/5" : "hover:bg-surface-2/50")}
                >
                  <Td>
                    <CompleteCheck
                      status={rb.status}
                      onComplete={() =>
                        markEntityComplete(usePmStore.getState(), "roadblock", rb.id)
                      }
                      onReopen={() => reopenEntity(usePmStore.getState(), "roadblock", rb.id)}
                    />
                  </Td>
                  <Td className="tabular font-medium">{projectCode(projects, rb.projectId)}</Td>
                  <Td className="max-w-[14rem]">{rb.title}</Td>
                  <Td>
                    <StatusBadge status={rb.category} />
                  </Td>
                  <Td>{rb.ballInCourt}</Td>
                  <Td>{rb.impact}</Td>
                  <Td>
                    <StatusBadge status={rb.severity} />
                  </Td>
                  <Td>
                    <StatusBadge status={rb.status} />
                  </Td>
                  <Td className={cn("tabular", overdue && "font-semibold text-status-red")}>
                    {rb.resolvedDate ? formatDate(rb.resolvedDate) : "No target date"}
                  </Td>
                  <Td className="font-mono text-xs text-muted">
                    {rb.linkedEntityType ? `${rb.linkedEntityType}:${rb.linkedEntityId}` : ""}
                  </Td>
                  <Td>
                    <RowActions
                      onEdit={() => {
                        setEditing(rb);
                        setDialog("edit");
                      }}
                      onDelete={() => setDeleteId(rb.id)}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
        {rows.length === 0 && (
          <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            {all.length === 0 ? "No roadblocks." : "All open roadblocks resolved. Toggle Show completed."}
          </div>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit roadblock" : "Add roadblock"}
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
            title: String(v.title),
            category: v.category as RoadblockCategory,
            description: String(v.description),
            raisedDate: String(v.raisedDate),
            ballInCourt: String(v.ballInCourt),
            impact: v.impact as RoadblockImpact,
            severity: v.severity as Priority,
            status: v.status as RoadblockStatus,
            resolvedDate: String(v.resolvedDate),
            linkedEntityType: String(v.linkedEntityType),
            linkedEntityId: String(v.linkedEntityId),
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
        title="Delete roadblock?"
        message="Remove this roadblock from the tracker?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
