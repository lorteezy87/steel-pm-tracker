import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarRange,
  ChevronRight,
  GanttChartSquare,
  Inbox,
  ListTree,
  NotebookPen,
  PanelLeft,
  Search,
  Sparkles,
  StickyNote,
  Sun,
  Tag as TagIcon,
} from "lucide-react";
import { useState } from "react";
import { PLANNER_NAV, SECONDARY_NAV } from "@/lib/pm/constants";
import { cn } from "@/lib/utils";

const ICONS = {
  Sun,
  GanttChartSquare,
  CalendarRange,
  NotebookPen,
  ListTree,
  Sparkles,
  Inbox,
  StickyNote,
  TagIcon,
} as const;

/**
 * The floating segmented control. This is the app's ONLY persistent navigation
 * — there is no rail. The panel button on its left opens the trackers, the
 * chevron on its right swaps to the second row.
 */
export function NavPill({ onOpenPanel }: { onOpenPanel: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const secondaryHasActive = SECONDARY_NAV.some(
    (i) => pathname === i.to || pathname.startsWith(`${i.to}/`),
  );
  const [showSecondary, setShowSecondary] = useState(secondaryHasActive);
  const items = showSecondary ? SECONDARY_NAV : PLANNER_NAV;

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

  return (
    // max-w-full + overflow-x-auto: the second row carries six destinations, and
    // on a 360px phone that pill was a few pixels wider than the screen and
    // scrolled the whole page sideways. Let the pill scroll within itself
    // instead. Children are shrink-0 so they stay legible rather than squashing.
    <nav className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-border-strong bg-surface-2/90 p-1 shadow-lg backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        type="button"
        onClick={onOpenPanel}
        aria-label="Open trackers"
        title="Trackers"
        className="shrink-0 rounded-full p-2 text-muted transition-colors hover:bg-surface-3 hover:text-fg"
      >
        <PanelLeft className="size-4" strokeWidth={1.75} />
      </button>
      <span className="mx-0.5 h-5 w-px shrink-0 bg-border-strong" aria-hidden />
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-surface-3 text-primary"
                : "text-muted hover:bg-surface-3 hover:text-fg",
            )}
          >
            <Icon className="size-4 shrink-0 md:hidden" strokeWidth={1.75} />
            <span className="hidden md:inline">{item.label}</span>
          </Link>
        );
      })}
      <span className="mx-0.5 h-5 w-px shrink-0 bg-border-strong" aria-hidden />
      <Link
        to="/search"
        aria-label="Search"
        title="Search"
        className={cn(
          "shrink-0 rounded-full p-2 transition-colors",
          pathname === "/search"
            ? "bg-surface-3 text-primary"
            : "text-muted hover:bg-surface-3 hover:text-fg",
        )}
      >
        <Search className="size-4" strokeWidth={1.75} />
      </Link>
      <button
        type="button"
        onClick={() => setShowSecondary((v) => !v)}
        aria-label={showSecondary ? "Show planner views" : "Show more views"}
        aria-expanded={showSecondary}
        className="shrink-0 rounded-full p-2 text-muted transition-colors hover:bg-surface-3 hover:text-fg"
      >
        <ChevronRight
          className={cn("size-4 transition-transform", showSecondary && "rotate-180")}
          strokeWidth={1.75}
        />
      </button>
    </nav>
  );
}
