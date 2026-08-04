import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  CalendarRange,
  Clock,
  FilePenLine,
  FileStack,
  Hammer,
  HardHat,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageSquareWarning,
  RotateCcw,
  Share2,
  Truck,
  X,
} from "lucide-react";
import { useState } from "react";
import { SyncStatusChip, WorkspaceSyncBootstrap } from "@/components/workspace-sync";
import { NAV_ITEMS } from "@/lib/pm/constants";
import { usePmStore } from "@/lib/pm/store";
import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

const ICONS = {
  LayoutDashboard,
  CalendarRange,
  Building2,
  FileStack,
  Hammer,
  Truck,
  HardHat,
  MessageSquareWarning,
  FilePenLine,
  ListTodo,
  Clock,
  CalendarDays,
  Share2,
} as const;

export function AppShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const resetSeed = usePmStore((s) => s.resetSeed);
  const { user, isPending } = useCurrentUserState();

  return (
    <div className="flex min-h-[calc(100dvh-var(--grok-banner-h,0px))] bg-bg text-fg">
      <WorkspaceSyncBootstrap />
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="border-b border-border px-4 py-4">
          <div className="text-[10px] font-semibold tracking-[0.14em] text-accent-steel uppercase">
            Steel PM
          </div>
          <div className="mt-0.5 text-sm font-semibold text-fg">Multi-Project Tracker</div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          <div className="px-1">
            <SyncStatusChip />
          </div>
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

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-bg/70"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold">Steel PM</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-muted hover:bg-surface-2"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {NAV_ITEMS.map((item) => {
                const Icon = ICONS[item.icon];
                const active =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/95 px-3 py-3 backdrop-blur md:px-6">
          <button
            type="button"
            className="rounded-md p-2 text-muted hover:bg-surface-2 md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-xs text-muted">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <SyncStatusChip />
            </div>
            {actions}
          </div>
        </header>
        <main className="forge-grid flex-1 p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
