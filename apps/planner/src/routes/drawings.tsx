import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, FileText, Layers } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { CompleteCheck, ShowCompletedToggle } from "@/components/complete-check";
import { BulkDrawingUploadButton } from "@/components/bulk-drawing-upload";
import { ConfirmDelete, CrudDialog, type FormFieldDef } from "@/components/crud-dialog";
import { DataTable, Td, Th } from "@/components/data-table";
import { defaultProjectId, projectField } from "@/components/project-select-field";
import { ProjectFilter } from "@/components/project-filter";
import { AddButton, RowActions } from "@/components/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { isDoneStatus } from "@/lib/pm/complete";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { DRAWING_STATUSES } from "@/lib/pm/constants";
import { filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { DrawingSet, DrawingSheet, DrawingStatus } from "@/lib/pm/types";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/drawings")({ component: DrawingsPage });

function DrawingsPage() {
  const projects = usePmStore((s) => s.projects);
  const drawingSets = usePmStore((s) => s.drawingSets);
  const drawingSheets = usePmStore((s) => s.drawingSheets);
  const filter = usePmStore((s) => s.filterProjectId);
  const addSet = usePmStore((s) => s.addDrawingSet);
  const updateSet = usePmStore((s) => s.updateDrawingSet);
  const deleteSet = usePmStore((s) => s.deleteDrawingSet);
  const addSheet = usePmStore((s) => s.addDrawingSheet);
  const updateSheet = usePmStore((s) => s.updateDrawingSheet);
  const deleteSheet = usePmStore((s) => s.deleteDrawingSheet);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const setsAll = filterByProject(drawingSets, filter);
  const sets = showCompleted
    ? setsAll
    : setsAll.filter((s) => !isDoneStatus(s.status));

  const [setDialog, setSetDialog] = useState<"add" | "edit" | null>(null);
  const [editingSet, setEditingSet] = useState<DrawingSet | null>(null);
  const [deleteSetId, setDeleteSetId] = useState<string | null>(null);

  const [sheetDialog, setSheetDialog] = useState<"add" | "edit" | null>(null);
  const [sheetParentId, setSheetParentId] = useState<string>("");
  const [editingSheet, setEditingSheet] = useState<DrawingSheet | null>(null);
  const [deleteSheetId, setDeleteSheetId] = useState<string | null>(null);

  const sheetsBySet = useMemo(() => {
    const m = new Map<string, DrawingSheet[]>();
    for (const sh of drawingSheets) {
      const list = m.get(sh.setId) ?? [];
      list.push(sh);
      m.set(sh.setId, list);
    }
    return m;
  }, [drawingSheets]);

  const setFields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "name", label: "Set name", type: "text", required: true },
      { key: "type", label: "Type", type: "text", placeholder: "Structural" },
      { key: "description", label: "Description", type: "text" },
      { key: "submitted", label: "Submitted", type: "date" },
      { key: "requiredBy", label: "Required by", type: "date" },
      { key: "status", label: "Status", type: "select", options: DRAWING_STATUSES },
      { key: "ballInCourt", label: "Ball in court", type: "text" },
      { key: "owner", label: "Owner", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [projects],
  );

  const sheetFields: FormFieldDef[] = useMemo(
    () => [
      {
        key: "setId",
        label: "Drawing set",
        type: "select",
        required: true,
        options: drawingSets.map((s) => ({
          value: s.id,
          label: `${projectCode(projects, s.projectId)} · ${s.name}`,
        })),
      },
      {
        key: "numberRev",
        label: "# + Rev",
        type: "text",
        required: true,
        placeholder: "S-101 Rev A",
      },
      { key: "description", label: "Description", type: "text", required: true },
      { key: "submitted", label: "Submitted", type: "date" },
      { key: "requiredBy", label: "Required by", type: "date" },
      { key: "status", label: "Status", type: "select", options: DRAWING_STATUSES },
      { key: "ballInCourt", label: "Ball in court", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [drawingSets, projects],
  );

  const setInitial = useMemo(() => {
    if (setDialog === "edit" && editingSet) {
      return { ...editingSet } as Record<string, string | number>;
    }
    return {
      projectId: defaultProjectId(projects, filter),
      name: "",
      type: "Structural",
      description: "",
      submitted: "",
      requiredBy: "",
      status: "Not Submitted",
      ballInCourt: "",
      owner: "",
      notes: "",
    };
  }, [setDialog, editingSet, projects, filter]);

  const sheetInitial = useMemo(() => {
    if (sheetDialog === "edit" && editingSheet) {
      return { ...editingSheet } as Record<string, string | number>;
    }
    return {
      setId: sheetParentId || drawingSets[0]?.id || "",
      numberRev: "",
      description: "",
      submitted: "",
      requiredBy: "",
      status: "Not Submitted",
      ballInCourt: "",
      notes: "",
    };
  }, [sheetDialog, editingSheet, sheetParentId, drawingSets]);

  function isOpen(id: string) {
    return expanded[id] !== false;
  }

  return (
    <AppShell
      title="Drawings & Submittals"
      subtitle="Sets → sheets · bulk PDF upload splits by page"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={setsAll.filter((s) => !isDoneStatus(s.status)).length}
            totalCount={setsAll.length}
          />
          <ProjectFilter />
          <BulkDrawingUploadButton
            onDone={(msg) => {
              setBanner(msg);
              window.setTimeout(() => setBanner(null), 6000);
            }}
          />
          <AddButton
            label="Add set"
            onClick={() => {
              setEditingSet(null);
              setSetDialog("add");
            }}
          />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-3">
        {banner ? (
          <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-fg">
            {banner}
          </div>
        ) : null}

        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th className="w-8" />
              <Th>Project</Th>
              <Th>Set / Sheet</Th>
              <Th>Type</Th>
              <Th>Description</Th>
              <Th>Submitted</Th>
              <Th>Required By</Th>
              <Th>Status</Th>
              <Th>Ball in Court</Th>
              <Th>Owner</Th>
              <Th className="w-20">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => {
              const sheets = (sheetsBySet.get(set.id) ?? []).filter(
                (sh) => showCompleted || !isDoneStatus(sh.status),
              );
              const open = isOpen(set.id);
              const approved = sheets.filter((s) =>
                ["Approved", "Approved as Noted"].includes(s.status),
              ).length;

              return (
                <Fragment key={set.id}>
                  <tr className="bg-surface-2/40 hover:bg-surface-2/70">
                    <Td>
                      <CompleteCheck
                        status={set.status}
                        onComplete={() =>
                          markEntityComplete(usePmStore.getState(), "drawingSet", set.id)
                        }
                        onReopen={() =>
                          reopenEntity(usePmStore.getState(), "drawingSet", set.id)
                        }
                      />
                    </Td>
                    <Td className="w-8 px-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((e) => ({ ...e, [set.id]: !open }))
                        }
                        className="rounded p-1 text-muted hover:bg-surface-3 hover:text-fg"
                        aria-label={open ? "Collapse" : "Expand"}
                      >
                        {open ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>
                    </Td>
                    <Td className="tabular font-medium text-primary">
                      {projectCode(projects, set.projectId)}
                    </Td>
                    <Td>
                      <div className="flex items-start gap-2">
                        <Layers className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <div className="font-semibold">{set.name}</div>
                          <div className="text-[11px] text-muted tabular">
                            {sheets.length} sheets
                            {sheets.length > 0
                              ? ` · ${approved}/${sheets.length} approved`
                              : ""}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-muted">{set.type}</Td>
                    <Td className="max-w-[12rem]">{set.description}</Td>
                    <Td className="tabular">{formatDate(set.submitted)}</Td>
                    <Td className="tabular">{formatDate(set.requiredBy)}</Td>
                    <Td>
                      <StatusBadge status={set.status} />
                    </Td>
                    <Td>{set.ballInCourt}</Td>
                    <Td>{set.owner}</Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-md px-1.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                          onClick={() => {
                            setSheetParentId(set.id);
                            setEditingSheet(null);
                            setSheetDialog("add");
                            setExpanded((e) => ({ ...e, [set.id]: true }));
                          }}
                        >
                          + Sheet
                        </button>
                        <RowActions
                          onEdit={() => {
                            setEditingSet(set);
                            setSetDialog("edit");
                          }}
                          onDelete={() => setDeleteSetId(set.id)}
                        />
                      </div>
                    </Td>
                  </tr>

                  {open &&
                    sheets.map((sh) => (
                      <tr
                        key={sh.id}
                        className="border-l-2 border-l-primary/30 hover:bg-surface-2/40"
                      >
                        <Td>
                          <CompleteCheck
                            status={sh.status}
                            onComplete={() =>
                              markEntityComplete(
                                usePmStore.getState(),
                                "drawingSheet",
                                sh.id,
                              )
                            }
                            onReopen={() =>
                              reopenEntity(
                                usePmStore.getState(),
                                "drawingSheet",
                                sh.id,
                              )
                            }
                          />
                        </Td>
                        <Td />
                        <Td className="text-subtle">↳</Td>
                        <Td>
                          <div className="flex items-start gap-2 pl-4">
                            <FileText className="mt-0.5 size-3.5 shrink-0 text-accent-steel" />
                            <div className="font-mono text-xs font-semibold">
                              {sh.numberRev}
                            </div>
                          </div>
                        </Td>
                        <Td className="text-subtle">—</Td>
                        <Td>{sh.description}</Td>
                        <Td className="tabular">{formatDate(sh.submitted)}</Td>
                        <Td className="tabular">{formatDate(sh.requiredBy)}</Td>
                        <Td>
                          <StatusBadge status={sh.status} />
                        </Td>
                        <Td>{sh.ballInCourt}</Td>
                        <Td className="text-muted">—</Td>
                        <Td>
                          <RowActions
                            onEdit={() => {
                              setEditingSheet(sh);
                              setSheetDialog("edit");
                            }}
                            onDelete={() => setDeleteSheetId(sh.id)}
                          />
                        </Td>
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </DataTable>
        {sets.length === 0 && (
          <div className="rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            No drawing sets. Use <strong>Bulk upload</strong> or Add set.
          </div>
        )}
      </div>

      <CrudDialog
        open={setDialog !== null}
        title={setDialog === "edit" ? "Edit drawing set" : "Add drawing set"}
        fields={setFields}
        initial={setInitial}
        submitLabel={setDialog === "edit" ? "Save changes" : "Create set"}
        onClose={() => {
          setSetDialog(null);
          setEditingSet(null);
        }}
        onSubmit={(v) => {
          const row = {
            projectId: String(v.projectId),
            name: String(v.name),
            type: String(v.type),
            description: String(v.description),
            submitted: String(v.submitted),
            requiredBy: String(v.requiredBy),
            status: v.status as DrawingStatus,
            ballInCourt: String(v.ballInCourt),
            owner: String(v.owner),
            notes: String(v.notes),
          };
          if (setDialog === "edit" && editingSet) updateSet(editingSet.id, row);
          else addSet(row);
          setSetDialog(null);
          setEditingSet(null);
        }}
      />

      <CrudDialog
        open={sheetDialog !== null}
        title={sheetDialog === "edit" ? "Edit sheet" : "Add sheet"}
        fields={sheetFields}
        initial={sheetInitial}
        submitLabel={sheetDialog === "edit" ? "Save changes" : "Create sheet"}
        onClose={() => {
          setSheetDialog(null);
          setEditingSheet(null);
        }}
        onSubmit={(v) => {
          const row = {
            setId: String(v.setId),
            numberRev: String(v.numberRev),
            description: String(v.description),
            submitted: String(v.submitted),
            requiredBy: String(v.requiredBy),
            status: v.status as DrawingStatus,
            ballInCourt: String(v.ballInCourt),
            notes: String(v.notes),
          };
          if (sheetDialog === "edit" && editingSheet)
            updateSheet(editingSheet.id, row);
          else addSheet(row);
          setSheetDialog(null);
          setEditingSheet(null);
        }}
      />

      <ConfirmDelete
        open={!!deleteSetId}
        title="Delete drawing set?"
        message="This also deletes all sheets in the set."
        onClose={() => setDeleteSetId(null)}
        onConfirm={() => {
          if (deleteSetId) deleteSet(deleteSetId);
          setDeleteSetId(null);
        }}
      />
      <ConfirmDelete
        open={!!deleteSheetId}
        title="Delete sheet?"
        message="Remove this sheet from its set?"
        onClose={() => setDeleteSheetId(null)}
        onConfirm={() => {
          if (deleteSheetId) deleteSheet(deleteSheetId);
          setDeleteSheetId(null);
        }}
      />
    </AppShell>
  );
}
