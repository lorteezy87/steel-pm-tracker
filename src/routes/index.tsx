import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { KpiBoard } from "@/components/kpi-board";
import { LookaheadTable } from "@/components/lookahead-table";
import { isDoneStatus } from "@/lib/pm/complete";
import {
  DEMO_TODAY,
  buildLookahead,
  computeKpis,
  usePmStore,
} from "@/lib/pm/store";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const state = usePmStore();
  const kpi = computeKpis(state);
  const end48 = (() => {
    const d = new Date(DEMO_TODAY + "T12:00:00");
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  })();
  const next48 = buildLookahead(state, end48).filter((i) => !isDoneStatus(i.status));

  return (
    <AppShell
      title="KPI Board"
      subtitle={`Live snapshot · demo date ${DEMO_TODAY}`}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <KpiBoard kpi={kpi} />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
              Next 48 hours · open only
            </h2>
            <Link
              to="/lookahead-48h"
              className="text-xs font-medium text-primary hover:underline"
            >
              Full 48h view
            </Link>
          </div>
          <LookaheadTable items={next48} />
        </section>
      </div>
    </AppShell>
  );
}
