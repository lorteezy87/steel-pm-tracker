import { createFileRoute, Link } from "@tanstack/react-router";
import { Tag as TagIcon, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TagChip } from "@/components/tag-picker";
import { ConfirmDelete } from "@/components/crud-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { trackerColor } from "@/lib/pm/calendar-events";
import { TAG_COLORS, TAG_COLOR_CLASSES } from "@/lib/pm/constants";
import { buildSearchIndex } from "@/lib/pm/search";
import { usePmStore } from "@/lib/pm/store";
import type { TagColor } from "@/lib/pm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tags")({ component: TagsPage });

/**
 * Browse the job by tag instead of by tracker. A tag like "Grid C" pulls the
 * RFI, the submittal and the field note that all concern the same problem into
 * one view — which is how the problem actually gets talked about.
 */
function TagsPage() {
  const state = usePmStore();
  const { tags, entityTags } = state;
  const updateTag = usePmStore((s) => s.updateTag);
  const deleteTag = usePmStore((s) => s.deleteTag);

  const [selected, setSelected] = useState<string | null>(tags[0]?.id ?? null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Resolve tagged records through the search index — it already knows how to
  // render any entity type as a titled, linkable row.
  const index = useMemo(() => buildSearchIndex(state), [state]);
  const byKey = useMemo(
    () => new Map(index.map((h) => [`${h.entityType}:${h.entityId}`, h])),
    [index],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const et of entityTags) {
      // Only count attachments that still resolve — a tag pointing at a deleted
      // record shouldn't inflate the count (see migrations/0007).
      if (!byKey.has(`${et.entityType}:${et.entityId}`)) continue;
      map.set(et.tagId, (map.get(et.tagId) ?? 0) + 1);
    }
    return map;
  }, [entityTags, byKey]);

  const active = tags.find((t) => t.id === selected) ?? null;
  const hits = useMemo(() => {
    if (!active) return [];
    return entityTags
      .filter((et) => et.tagId === active.id)
      .map((et) => byKey.get(`${et.entityType}:${et.entityId}`))
      .filter((h): h is NonNullable<typeof h> => Boolean(h));
  }, [active, entityTags, byKey]);

  return (
    <AppShell title="Tags" subtitle="Cut across the trackers by what the issue actually is">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[10px] font-semibold tracking-[0.14em] text-subtle uppercase">
            <TagIcon className="size-3.5" /> Tags
          </div>
          {tags.length === 0 && (
            <p className="px-3 py-4 text-sm text-subtle">
              No tags yet. Add one from any item in Lists.
            </p>
          )}
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelected(t.id)}
              className={cn(
                "flex w-full items-center gap-2 border-b border-border/70 px-3 py-2.5 text-left transition-colors last:border-b-0",
                t.id === selected ? "bg-primary/15" : "hover:bg-surface-2",
              )}
            >
              <TagChip tag={t} />
              <span className="tabular ml-auto rounded-full bg-surface-3 px-1.5 py-px text-[10px] font-bold text-muted">
                {counts.get(t.id) ?? 0}
              </span>
            </button>
          ))}
        </aside>

        <section className="min-w-0 rounded-xl border border-border bg-surface">
          {!active ? (
            <p className="px-4 py-12 text-center text-sm text-subtle">
              Select a tag.
            </p>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <TagChip tag={active} />
                  <span className="tabular text-xs text-muted">
                    {hits.length} item{hits.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {TAG_COLORS.map((c: TagColor) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Set color ${c}`}
                      onClick={() => updateTag(active.id, { color: c })}
                      className={cn(
                        "size-4 rounded-full border",
                        TAG_COLOR_CLASSES[c],
                        active.color === c && "ring-2 ring-fg/40",
                      )}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setDeleteId(active.id)}
                    aria-label="Delete tag"
                    className="ml-1 rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-status-red"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </header>

              {hits.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-subtle">
                  Nothing carries this tag.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {hits.map((h) => (
                    <li key={h.key}>
                      <Link
                        to={h.href}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-2"
                      >
                        <span
                          className={cn(
                            "mt-0.5 shrink-0 rounded border px-1.5 py-px text-[10px] font-semibold",
                            h.tracker === "Notes" || h.tracker === "Projects"
                              ? "border-border bg-surface-3 text-muted"
                              : trackerColor(h.tracker),
                          )}
                        >
                          {h.tracker}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">
                            {h.title}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {h.projectCode ? `${h.projectCode} · ` : ""}
                            {h.subtitle}
                          </span>
                        </span>
                        {h.status ? <StatusBadge status={h.status} /> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      <ConfirmDelete
        open={!!deleteId}
        title="Delete tag?"
        message="The tag is removed from every record it's on. The records themselves are untouched."
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            deleteTag(deleteId);
            setSelected((cur) => (cur === deleteId ? null : cur));
          }
          setDeleteId(null);
        }}
      />
    </AppShell>
  );
}
