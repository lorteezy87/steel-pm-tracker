import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarRange,
  ChevronRight,
  GanttChartSquare,
  Inbox,
  LayoutDashboard,
  ListTree,
  NotebookPen,
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
 * The floating segmented control that carries the five planner views. Rendered
 * in the app header on every page so the day-to-day surfaces are always one tap
 * away, with the Command Center pinned on the left as the way back out.
 */
export function PlannerNav({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // The chevron swaps the pill to the second row (Journal / Lists / Smart
  // Lists / Inbox / Notes / Tags), matching the reference app's overflow.
  const secondaryHasActive = SECONDARY_NAV.some(
    (i) => pathname === i.to || pathname.startsWith(`${i.to}/`),
  );
  const [showSecondary, setShowSecondary] = useState(secondaryHasActive);
  const items = showSecondary ? SECONDARY_NAV : PLANNER_NAV;

  return (
    <nav
      className={cn(
        "flex items-center gap-0.5 rounded-full border border-border-strong bg-surface-2/90 p-1 shadow-lg backdrop-blur",
        className,
      )}
    >
      <Link
        to="/"
        aria-label="Command Center"
        title="Command Center"
        className={cn(
          "rounded-full p-2 transition-colors",
          pathname === "/"
            ? "bg-surface-3 text-primary"
            : "text-muted hover:bg-surface-3 hover:text-fg",
        )}
      >
        <LayoutDashboard className="size-4" strokeWidth={1.75} />
      </Link>
      <span className="mx-0.5 h-5 w-px bg-border-strong" aria-hidden />
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-surface-3 text-primary"
                : "text-muted hover:bg-surface-3 hover:text-fg",
            )}
          >
            <Icon className="size-4 shrink-0 sm:hidden" strokeWidth={1.75} />
            <span className="hidden sm:inline">{item.label}</span>
          </Link>
        );
      })}
      <span className="mx-0.5 h-5 w-px bg-border-strong" aria-hidden />
      <Link
        to="/search"
        aria-label="Search"
        title="Search"
        className={cn(
          "rounded-full p-2 transition-colors",
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
        className="rounded-full p-2 text-muted transition-colors hover:bg-surface-3 hover:text-fg"
      >
        <ChevronRight
          className={cn("size-4 transition-transform", showSecondary && "rotate-180")}
          strokeWidth={1.75}
        />
      </button>
    </nav>
  );
}
