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
import { PRIORITIES, TASK_STATUSES } from "@/lib/pm/constants";
import { filterOpenOnly } from "@/lib/pm/complete";
import { markEntityComplete, reopenEntity } from "@/lib/pm/mark-complete";
import { filterByProject, projectCode, usePmStore } from "@/lib/pm/store";
import type { Priority, Task, TaskStatus } from "@/lib/pm/types";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/tasks")({ component: TasksPage });

function TasksPage() {
  const projects = usePmStore((s) => s.projects);
  const tasks = usePmStore((s) => s.tasks);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addTask);
  const update = usePmStore((s) => s.updateTask);
  const del = usePmStore((s) => s.deleteTask);
  const [showCompleted, setShowCompleted] = useState(false);
  const all = filterByProject(tasks, filter);
  const rows = filterOpenOnly(all, showCompleted);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fields: FormFieldDef[] = useMemo(
    () => [
      projectField(projects),
      { key: "task", label: "Task", type: "text", required: true },
      { key: "category", label: "Category", type: "text", placeholder: "QC / Field / Logistics" },
      { key: "owner", label: "Owner", type: "text" },
      { key: "due", label: "Due", type: "date" },
      { key: "status", label: "Status", type: "select", options: TASK_STATUSES },
      { key: "priority", label: "Priority", type: "select", options: PRIORITIES },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    [projects],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) return { ...editing } as Record<string, string | number>;
    return {
      projectId: defaultProjectId(projects, filter),
      task: "",
      category: "",
      owner: "",
      due: "",
      status: "Not Started",
      priority: "Med",
      notes: "",
    };
  }, [dialog, editing, projects, filter]);

  return (
    <AppShell
      title="Basic Tasks"
      subtitle="Check done to clear · full CRUD"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ShowCompletedToggle
            show={showCompleted}
            onChange={setShowCompleted}
            openCount={filterOpenOnly(all, false).length}
            totalCount={all.length}
          />
          <ProjectFilter />
          <AddButton label="Add task" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <DataTable>
          <thead>
            <tr>
              <Th className="w-10">Done</Th>
              <Th>Project</Th>
              <Th>Task</Th>
              <Th>Category</Th>
              <Th>Owner</Th>
              <Th>Due</Th>
              <Th>Status</Th>
              <Th>Priority</Th>
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
                      markEntityComplete(usePmStore.getState(), "task", r.id)
                    }
                    onReopen={() => reopenEntity(usePmStore.getState(), "task", r.id)}
                  />
                </Td>
                <Td className="tabular font-medium">{projectCode(projects, r.projectId)}</Td>
                <Td className="max-w-[16rem] font-medium">{r.task}</Td>
                <Td className="text-muted">{r.category}</Td>
                <Td>{r.owner}</Td>
                <Td className="tabular">{formatDate(r.due)}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td>
                  <StatusBadge status={r.priority} />
                </Td>
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
            {all.length === 0 ? "No tasks." : "All tasks complete. Toggle Show completed to review."}
          </div>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit task" : "Add task"}
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
            task: String(v.task),
            category: String(v.category),
            owner: String(v.owner),
            due: String(v.due),
            status: v.status as TaskStatus,
            priority: v.priority as Priority,
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
        title="Delete task?"
        message="Remove this task?"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
