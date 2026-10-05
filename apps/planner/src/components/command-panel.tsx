import { Link, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CalendarRange,
  Clock,
  FilePenLine,
  FileStack,
  Hammer,
  HardHat,
  Inbox,
  LayoutDashboard,
  ListTodo,
  MessageSquareWarning,
  PackageSearch,
  RotateCcw,
  Search,
  Send,
  Share2,
  Tag as TagIcon,
  Truck,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { PANEL_SECTIONS } from "@/lib/pm/constants";
import { usePmStore } from "@/lib/pm/store";
import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const ICONS = {
  FileStack,
  Send,
  Hammer,
  Truck,
  HardHat,
  MessageSquareWarning,
  FilePenLine,
  AlertTriangle,
  Building2,
  PackageSearch,
  ListTodo,
  LayoutDashboard,
  CalendarRange,
  Clock,
  CalendarDays,
  Share2,
} as const;

/**
 * Slide-over holding the record-level trackers. Deliberately not a permanent
 * rail: the planner views are what you look at all day, and a 15-item rail
 * standing next to them is noise you learn to ignore.
 */
export function CommandPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const resetSeed = usePmStore((s) => s.resetSeed);
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 bg-bg/70 backdrop-blur-sm"
      />
      <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.14em] text-accent-steel uppercase">
              Steel PM
            </div>
            <div className="text-sm font-semibold text-fg">Planner</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-2 text-muted hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="border-b border-border p-2">
          <PanelLink to="/search" icon={Search} label="Search" onClose={onClose} pathname={pathname} />
          <PanelLink to="/inbox" icon={Inbox} label="Inbox" onClose={onClose} pathname={pathname} />
          <PanelLink to="/tags" icon={TagIcon} label="Tags" onClose={onClose} pathname={pathname} />
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          {PANEL_SECTIONS.map((section) => (
            <div key={section.label} className="mb-3">
              <div className="px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-subtle uppercase">
                {section.label}
              </div>
              {section.items.map((item) => (
                <PanelLink
                  key={item.to}
                  to={item.to}
                  icon={ICONS[item.icon]}
                  label={item.label}
                  onClose={onClose}
                  pathname={pathname}
                />
              ))}
            </div>
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <button
            type="button"
            onClick={() => resetSeed()}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-fg"
          >
            <RotateCcw className="size-3.5" />
            Reset sample data
          </button>
          <div className="flex items-center justify-between px-1">
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-surface-3" />
            ) : user ? (
              <SignedIn>
                <UserButton />
              </SignedIn>
            ) : (
              <SignedOut>
                <Link to="/login" className="text-xs text-primary hover:underline">
                  Sign in
                </Link>
              </SignedOut>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function PanelLink({
  to,
  icon: Icon,
  label,
  onClose,
  pathname,
}: {
  to: string;
  icon: typeof Share2;
  label: string;
  onClose: () => void;
  pathname: string;
}) {
  const active = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      onClick={onClose}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-primary/15 text-primary" : "text-muted hover:bg-surface-2 hover:text-fg",
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </Link>
  );
}
