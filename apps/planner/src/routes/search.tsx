import { createFileRoute, Link } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { TagChip } from "@/components/tag-picker";
import { trackerColor } from "@/lib/pm/calendar-events";
import { buildSearchIndex, searchHits, type SearchHit } from "@/lib/pm/search";
import { tagsFor, usePmStore } from "@/lib/pm/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/search")({ component: SearchPage });

function SearchPage() {
  const state = usePmStore();
  const [query, setQuery] = useState("");

  const index = useMemo(() => buildSearchIndex(state), [state]);
  const hits = useMemo(() => searchHits(index, query), [index, query]);

  // Group by tracker so results read as "3 RFIs, 2 submittals", not a flat list.
  const grouped = useMemo(() => {
    const map = new Map<string, SearchHit[]>();
    for (const h of hits) {
      const list = map.get(h.tracker);
      if (list) list.push(h);
      else map.set(h.tracker, [h]);
    }
    return [...map.entries()];
  }, [hits]);

  return (
    <AppShell title="Search" subtitle="Everything, everywhere, across every tracker">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 focus-within:border-primary">
          <SearchIcon className="size-4 shrink-0 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Piece mark, RFI number, grid line, spec section, anyone's name…"
            className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
          />
          {query ? (
            <span className="tabular shrink-0 text-xs text-muted">{hits.length}</span>
          ) : null}
        </div>

        {!query ? (
          <p className="px-4 py-12 text-center text-sm text-subtle">
            Type to search projects, detailing, submittals, fab, delivery, install,
            RFIs, change orders, roadblocks, tasks and notes.
          </p>
        ) : hits.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-subtle">
            Nothing matches &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([tracker, rows]) => (
              <section
                key={tracker}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <header className="flex items-center gap-2 border-b border-border px-4 py-2">
                  <span className="text-xs font-semibold tracking-wide text-muted uppercase">
                    {tracker}
                  </span>
                  <span className="tabular text-xs text-subtle">{rows.length}</span>
                </header>
                <ul className="divide-y divide-border/60">
                  {rows.map((h) => (
                    <SearchRow key={h.key} hit={h} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SearchRow({ hit }: { hit: SearchHit }) {
  const tags = usePmStore((s) => s.tags);
  const entityTags = usePmStore((s) => s.entityTags);
  const attached = tagsFor({ tags, entityTags }, hit.entityType, hit.entityId);

  return (
    <li>
      <Link to={hit.href} className="flex items-start gap-3 px-4 py-2.5 hover:bg-surface-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-fg">{hit.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
            {hit.projectCode ? (
              <span className="font-semibold text-accent-steel">{hit.projectCode}</span>
            ) : null}
            {hit.date ? <span className="tabular text-muted">{hit.date}</span> : null}
            <span className="min-w-0 truncate text-subtle">{hit.subtitle}</span>
            {attached.map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
          </span>
        </span>
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded border px-1.5 py-px text-[10px] font-semibold",
            hit.tracker === "Notes" || hit.tracker === "Projects"
              ? "border-border bg-surface-3 text-muted"
              : trackerColor(hit.tracker),
          )}
        >
          {hit.tracker}
        </span>
        {hit.status ? <StatusBadge status={hit.status} /> : null}
      </Link>
    </li>
  );
}
