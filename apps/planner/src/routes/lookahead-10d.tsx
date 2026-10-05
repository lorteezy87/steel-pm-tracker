import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { LookaheadTable } from "@/components/lookahead-table";
import { DEMO_TODAY, buildLookahead, usePmStore } from "@/lib/pm/store";

export const Route = createFileRoute("/lookahead-10d")({ component: Lookahead10 });

function Lookahead10() {
  const state = usePmStore();
  const end = (() => {
    const d = new Date(DEMO_TODAY + "T12:00:00");
    d.setDate(d.getDate() + 10);
    return d.toISOString().slice(0, 10);
  })();
  const items = buildLookahead(state, end);

  return (
    <AppShell
      title="10-Day Lookahead"
      subtitle={`Due/planned ≤ ${end} · full rolling window across all trackers`}
    >
      <div className="mx-auto max-w-7xl space-y-3">
        <p className="text-xs text-muted">
          Same columns as 48h. Use for weekly planning and shop/site coordination.
        </p>
        <LookaheadTable items={items} />
      </div>
    </AppShell>
  );
}
