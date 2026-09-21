import { createFileRoute } from "@tanstack/react-router";
import { Check, Inbox as InboxIcon, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TagPicker } from "@/components/tag-picker";
import { DEMO_TODAY, projectCode, usePmStore } from "@/lib/pm/store";
import type { Note } from "@/lib/pm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({ component: InboxPage });

/**
 * Quick capture. The point is zero friction: type it, hit enter, get back to
 * what you were doing. A capture needs no project and no date — forcing either
 * at capture time is exactly what stops things getting written down at all.
 * Triage turns it into a real task, or files it as a note.
 */
function InboxPage() {
  const projects = usePmStore((s) => s.projects);
  const notes = usePmStore((s) => s.notes);
  const addNote = usePmStore((s) => s.addNote);
  const updateNote = usePmStore((s) => s.updateNote);
  const deleteNote = usePmStore((s) => s.deleteNote);
  const addTask = usePmStore((s) => s.addTask);

  const [draft, setDraft] = useState("");
  const items = useMemo(() => notes.filter((n) => !n.triaged), [notes]);

  function capture() {
    const text = draft.trim();
    if (!text) return;
    // First line is the title, the rest is the body — the way a jotted note
    // naturally reads.
    const [first, ...rest] = text.split("\n");
    addNote({
      projectId: "",
      noteDate: "",
      noteTime: "",
      title: first,
      body: rest.join("\n"),
      pinned: false,
      triaged: false,
      author: "",
    });
    setDraft("");
  }

  return (
    <AppShell title="Inbox" subtitle="Capture now, triage later">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-xl border border-border bg-surface p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                capture();
              }
            }}
            rows={3}
            placeholder="AB at grid C looks off — check survey before we swing columns…"
            className="w-full resize-none bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-subtle">⌘/Ctrl + Enter to capture</span>
            <button
              type="button"
              onClick={capture}
              disabled={!draft.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg disabled:opacity-40"
            >
              Capture
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-muted">
            <InboxIcon className="mx-auto mb-2 size-6 text-subtle" />
            Inbox is clear.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <InboxRow
                key={n.id}
                note={n}
                projects={projects}
                onFile={(projectId) => updateNote(n.id, { triaged: true, projectId })}
                onPromote={(projectId) => {
                  addTask({
                    projectId,
                    task: n.title,
                    category: "Inbox",
                    owner: "",
                    due: DEMO_TODAY,
                    status: "Not Started",
                    priority: "Med",
                    notes: n.body,
                  });
                  // Keep the note as the written record, filed against the job.
                  updateNote(n.id, { triaged: true, projectId });
                }}
                onDelete={() => deleteNote(n.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function InboxRow({
  note,
  projects,
  onFile,
  onPromote,
  onDelete,
}: {
  note: Note;
  projects: { id: string; code: string; name: string }[];
  onFile: (projectId: string) => void;
  onPromote: (projectId: string) => void;
  onDelete: () => void;
}) {
  const [projectId, setProjectId] = useState(note.projectId || projects[0]?.id || "");
  return (
    <li className="rounded-xl border border-border bg-surface p-3">
      <div className="text-sm font-medium text-fg">{note.title}</div>
      {note.body ? (
        <p className="mt-1 text-sm whitespace-pre-wrap text-muted">{note.body}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <TagPicker entityType="note" entityId={note.id} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-2.5">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-fg outline-none focus:border-primary"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!projectId}
          onClick={() => onPromote(projectId)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-fg",
            !projectId && "opacity-40",
          )}
        >
          <Send className="size-3" /> Make a task
        </button>
        <button
          type="button"
          disabled={!projectId}
          onClick={() => onFile(projectId)}
          className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-2.5 py-1 text-xs font-semibold text-fg hover:bg-border-strong disabled:opacity-40"
        >
          <Check className="size-3" /> File as note
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete capture"
          className="ml-auto rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-status-red"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}
