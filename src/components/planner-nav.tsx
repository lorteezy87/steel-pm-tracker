import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarRange,
  GanttChartSquare,
  LayoutDashboard,
  ListTree,
  NotebookPen,
  Sun,
} from "lucide-react";
import { PLANNER_NAV } from "@/lib/pm/constants";
import { cn } from "@/lib/utils";

const ICONS = {
  Sun,
  GanttChartSquare,
  CalendarRange,
  NotebookPen,
  ListTree,
} as const;

/**
 * The floating segmented control that carries the five planner views. Rendered
 * in the app header on every page so the day-to-day surfaces are always one tap
 * away, with the Command Center pinned on the left as the way back out.
 */
export function PlannerNav({ className }: { className?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
      {PLANNER_NAV.map((item) => {
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
    </nav>
  );
}
