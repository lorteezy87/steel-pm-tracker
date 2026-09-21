import { useState } from "react";
import { CommandPanel } from "@/components/command-panel";
import { NavPill } from "@/components/nav-pill";
import { SyncStatusChip, WorkspaceSyncBootstrap } from "@/components/workspace-sync";

/**
 * The planner shell.
 *
 * Keeps the same `{ title, subtitle, actions, children }` contract the tracker
 * pages were written against, but renders the app's own chrome: a floating
 * nav pill and nothing else. No permanent rail — the record-level trackers
 * live in the slide-over `CommandPanel`, so the views a PM reads all day get
 * the full width and none of the furniture.
 */
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
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <WorkspaceSyncBootstrap />
      <CommandPanel open={panelOpen} onClose={() => setPanelOpen(false)} />

      <header className="sticky top-0 z-30 flex items-center gap-3 px-3 py-3 md:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-bg/80 backdrop-blur" />
        <div className="hidden min-w-0 flex-1 lg:block">
          <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex flex-1 justify-center lg:flex-none">
          <NavPill onOpenPanel={() => setPanelOpen(true)} />
        </div>
        <div className="flex min-w-0 flex-1 shrink-0 items-center justify-end gap-2">
          <div className="hidden xl:block">
            <SyncStatusChip />
          </div>
          {actions}
        </div>
      </header>

      {/* On narrow screens the pill takes the header, so the page title moves
          inline above the content rather than disappearing entirely. */}
      <div className="px-3 pt-1 lg:hidden md:px-6">
        <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
      </div>

      <main className="p-3 md:p-6">{children}</main>
    </div>
  );
}
