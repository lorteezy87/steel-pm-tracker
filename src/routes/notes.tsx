import { createFileRoute } from "@tanstack/react-router";
import { Pin, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ConfirmDelete, CrudDialog, type FormFieldDef } from "@/components/crud-dialog";
import { ProjectFilter } from "@/components/project-filter";
import { AddButton, RowActions } from "@/components/row-actions";
import { TagPicker } from "@/components/tag-picker";
import { projectCode, usePmStore } from "@/lib/pm/store";
import type { Note } from "@/lib/pm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notes")({ component: NotesPage });

function NotesPage() {
  const projects = usePmStore((s) => s.projects);
  const notes = usePmStore((s) => s.notes);
  const filter = usePmStore((s) => s.filterProjectId);
  const add = usePmStore((s) => s.addNote);
  const update = usePmStore((s) => s.updateNote);
  const del = usePmStore((s) => s.deleteNote);

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<Note | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const scoped =
      filter === "all" ? notes : notes.filter((n) => n.projectId === filter);
    // Pinned first, then most recently dated. An unproject'd note still shows
    // under "All projects" so nothing captured can go missing.
    return [...scoped].sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        (b.noteDate || "").localeCompare(a.noteDate || "") ||
        a.title.localeCompare(b.title),
    );
  }, [notes, filter]);

  const fields: FormFieldDef[] = useMemo(
    () => [
      {
        key: "projectId",
        label: "Project",
        type: "select",
        options: [
          { value: "", label: "— none —" },
          ...projects.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
        ],
      },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "body", label: "Note", type: "textarea" },
      { key: "noteDate", label: "Date (puts it on the Journal)", type: "date" },
      { key: "noteTime", label: "Time", type: "text", placeholder: "14:30" },
      { key: "author", label: "Logged by", type: "text" },
    ],
    [projects],
  );

  const initial = useMemo(() => {
    if (dialog === "edit" && editing) {
      return {
        projectId: editing.projectId,
        title: editing.title,
        body: editing.body,
        noteDate: editing.noteDate,
        noteTime: editing.noteTime,
        author: editing.author,
      } as Record<string, string | number>;
    }
    return {
      projectId: filter === "all" ? "" : filter,
      title: "",
      body: "",
      noteDate: "",
      noteTime: "",
      author: "",
    };
  }, [dialog, editing, filter]);

  return (
    <AppShell
      title="Notes"
      subtitle="Meeting notes, coordination notes, anything worth keeping"
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ProjectFilter />
          <AddButton label="New note" onClick={() => setDialog("add")} />
        </div>
      }
    >
      <div className="mx-auto max-w-4xl">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-muted">
            <StickyNote className="mx-auto mb-2 size-6 text-subtle" />
            No notes yet.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "rounded-xl border bg-surface p-4 transition-colors",
                  n.pinned
                    ? "border-primary/40"
                    : "border-border hover:border-border-strong",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-fg">{n.title}</h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-subtle">
                      {n.projectId ? (
                        <span className="font-semibold text-accent-steel">
                          {projectCode(projects, n.projectId)}
                        </span>
                      ) : (
                        <span className="italic">no project</span>
                      )}
                      {n.noteDate ? (
                        <span className="tabular">
                          · {n.noteDate}
                          {n.noteTime ? ` ${n.noteTime}` : ""}
                        </span>
                      ) : null}
                      {!n.triaged ? (
                        <span className="rounded border border-status-yellow/40 bg-status-yellow/15 px-1 text-[10px] font-semibold text-status-yellow">
                          Inbox
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => update(n.id, { pinned: !n.pinned })}
                      aria-label={n.pinned ? "Unpin note" : "Pin note"}
                      className={cn(
                        "rounded-md p-1.5 hover:bg-surface-2",
                        n.pinned ? "text-primary" : "text-muted",
                      )}
                    >
                      <Pin className={cn("size-3.5", n.pinned && "fill-current")} />
                    </button>
                    <RowActions
                      onEdit={() => {
                        setEditing(n);
                        setDialog("edit");
                      }}
                      onDelete={() => setDeleteId(n.id)}
                    />
                  </div>
                </div>
                {n.body ? (
                  <p className="mt-2 text-sm whitespace-pre-wrap text-muted">{n.body}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  <TagPicker entityType="note" entityId={n.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CrudDialog
        open={dialog !== null}
        title={dialog === "edit" ? "Edit note" : "New note"}
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
            body: String(v.body),
            noteDate: String(v.noteDate),
            noteTime: String(v.noteTime),
            author: String(v.author),
          };
          if (dialog === "edit" && editing) update(editing.id, row);
          // A note created here is deliberate, not a capture — file it straight away.
          else add({ ...row, pinned: false, triaged: true });
          setDialog(null);
          setEditing(null);
        }}
      />
      <ConfirmDelete
        open={!!deleteId}
        title="Delete note?"
        message="This also removes its tags."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) del(deleteId);
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
