import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ShareAccessPanel, SyncStatusChip } from "@/components/workspace-sync";

export const Route = createFileRoute("/access")({ component: AccessPage });

function AccessPage() {
  return (
    <AppShell
      title="Multi-device access"
      subtitle="Same link on every computer · shared live data"
      actions={<SyncStatusChip />}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <ShareAccessPanel />
        <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <h3 className="text-sm font-semibold text-fg">How to use on other computers</h3>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed">
            <li>Copy the team link above (or your published production URL).</li>
            <li>Open it in Chrome, Edge, or Safari on any laptop, shop PC, or phone.</li>
            <li>
              Everyone sees the same projects, drawings, fab, RFIs, and calendar
              to-dos — check-complete and edits sync automatically.
            </li>
            <li>
              Optional backup: Export JSON and email/drive it; Import on another
              machine if needed.
            </li>
          </ol>
          <p className="mt-3 text-xs">
            Source / deploy from GitHub:{" "}
            <a
              className="font-medium text-primary hover:underline"
              href="https://github.com/lorteezy87/steel-pm-tracker"
              target="_blank"
              rel="noreferrer"
            >
              github.com/lorteezy87/steel-pm-tracker
            </a>
            . Import that repo into Vercel and set a Postgres <code className="text-fg">DATABASE_URL</code> for durable multi-device sync.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
