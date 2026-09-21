import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { LookaheadTable } from "@/components/lookahead-table";
import { DEMO_TODAY, buildLookahead, usePmStore } from "@/lib/pm/store";

export const Route = createFileRoute("/lookahead-48h")({ component: Lookahead48 });

function Lookahead48() {
  const state = usePmStore();
  const end = (() => {
    const d = new Date(DEMO_TODAY + "T12:00:00");
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  })();
  const items = buildLookahead(state, end);

  return (
    <AppShell
      title="48-Hour Lookahead"
      subtitle={`Due/planned ≤ ${end} · sorted by due then priority · Gray/Blue/Yellow/Green/Red status colors`}
    >
      <div className="mx-auto max-w-7xl space-y-3">
        <p className="text-xs text-muted">
          Pulls every due/planned item from Drawings, Fab, Delivery, Installation,
          RFIs, and Tasks. Demo date locked to {DEMO_TODAY} for sample data.
        </p>
        <LookaheadTable items={items} />
      </div>
    </AppShell>
  );
}
