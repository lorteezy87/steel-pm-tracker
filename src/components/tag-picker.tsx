import { Plus, Tag as TagIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TAG_COLOR_CLASSES } from "@/lib/pm/constants";
import { tagsFor, usePmStore } from "@/lib/pm/store";
import type { Tag, TaggableType } from "@/lib/pm/types";
import { cn } from "@/lib/utils";

export function TagChip({
  tag,
  onRemove,
  className,
}: {
  tag: Tag;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-px text-[10px] font-semibold",
        TAG_COLOR_CLASSES[tag.color],
        className,
      )}
    >
      {tag.name}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${tag.name}`}
          className="opacity-60 hover:opacity-100"
        >
          <X className="size-2.5" />
        </button>
      ) : null}
    </span>
  );
}

/**
 * Attach/detach tags on any record. Deliberately one component used from the
 * row surfaces (Lists, Notes, Tags) rather than a field added to ten CRUD
 * dialogs — tagging happens while reading the board, not while filling a form.
 */
export function TagPicker({
  entityType,
  entityId,
  compact,
}: {
  entityType: TaggableType;
  entityId: string;
  compact?: boolean;
}) {
  const tags = usePmStore((s) => s.tags);
  const entityTags = usePmStore((s) => s.entityTags);
  const toggleTag = usePmStore((s) => s.toggleTag);
  const detachTag = usePmStore((s) => s.detachTag);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const attached = tagsFor({ tags, entityTags }, entityType, entityId);
  const attachedIds = new Set(attached.map((t) => t.id));
  const suggestions = tags.filter(
    (t) => !attachedIds.has(t.id) && t.name.toLowerCase().includes(draft.toLowerCase()),
  );
  const canCreate =
    draft.trim().length > 0 &&
    !tags.some((t) => t.name.toLowerCase() === draft.trim().toLowerCase());

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex flex-wrap items-center gap-1">
      {attached.map((t) => (
        <TagChip
          key={t.id}
          tag={t}
          onRemove={compact ? undefined : () => detachTag(entityType, entityId, t.id)}
        />
      ))}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Add tag"
        className={cn(
          "inline-flex items-center gap-0.5 rounded border border-dashed border-border-strong px-1 py-px text-[10px] text-subtle transition-colors hover:border-primary hover:text-primary",
          attached.length === 0 && "px-1.5",
        )}
      >
        {attached.length === 0 ? (
          <>
            <TagIcon className="size-2.5" /> tag
          </>
        ) : (
          <Plus className="size-2.5" />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border border-border-strong bg-surface-2 p-2 shadow-xl">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              const name = draft.trim() || suggestions[0]?.name;
              if (!name) return;
              toggleTag(entityType, entityId, name);
              setDraft("");
            }}
            placeholder="Find or create a tag…"
            className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-fg outline-none focus:border-primary"
          />
          <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto">
            {canCreate && (
              <button
                type="button"
                onClick={() => {
                  toggleTag(entityType, entityId, draft.trim());
                  setDraft("");
                }}
                className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs text-primary hover:bg-surface-3"
              >
                <Plus className="size-3" /> Create &ldquo;{draft.trim()}&rdquo;
              </button>
            )}
            {suggestions.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  toggleTag(entityType, entityId, t.name);
                  setDraft("");
                }}
                className="flex w-full items-center rounded px-1.5 py-1 text-left hover:bg-surface-3"
              >
                <TagChip tag={t} />
              </button>
            ))}
            {suggestions.length === 0 && !canCreate && (
              <p className="px-1.5 py-1 text-xs text-subtle">No other tags.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
