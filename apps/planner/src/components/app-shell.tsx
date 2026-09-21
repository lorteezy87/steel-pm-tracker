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

      {/* Below lg the pill needs the full width, so it takes its own row and
          the title + actions sit under it. Cramming all three onto one line
          squeezed the project filter until its label clipped to "…ojects". */}
      <header className="sticky top-0 z-30 px-3 py-3 md:px-6">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-bg/80 backdrop-blur" />
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
          <div className="flex justify-center lg:hidden">
            <NavPill onOpenPanel={() => setPanelOpen(true)} />
          </div>

          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 lg:flex-none lg:w-64 xl:w-80">
              <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
              {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
            </div>

            <div className="hidden flex-1 justify-center lg:flex">
              <NavPill onOpenPanel={() => setPanelOpen(true)} />
            </div>

            {/* Not shrink-0: the busiest pages pass three controls here
                (show-completed toggle, project filter, add button), which on a
                phone added up to more than the viewport and scrolled the page
                sideways. Let them wrap instead. */}
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 lg:w-64 lg:flex-nowrap xl:w-80">
              <div className="hidden xl:block">
                <SyncStatusChip />
              </div>
              {actions}
            </div>
          </div>
        </div>
      </header>

      <main className="p-3 md:p-6">{children}</main>
    </div>
  );
}
