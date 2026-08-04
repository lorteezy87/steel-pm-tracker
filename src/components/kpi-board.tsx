import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CircleDollarSign,
  HardHat,
  Hammer,
  MessageSquareWarning,
  Truck,
} from "lucide-react";
import type { KpiSnapshot } from "@/lib/pm/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CARDS: {
  key: keyof KpiSnapshot | "openRfisCombo" | "dueCombo";
  label: string;
  icon: typeof Building2;
  href: string;
  format: (k: KpiSnapshot) => string;
  warn?: (k: KpiSnapshot) => boolean;
}[] = [
  {
    key: "activeProjects",
    label: "Active Projects",
    icon: Building2,
    href: "/projects",
    format: (k) => String(k.activeProjects),
  },
  {
    key: "openRfisCombo",
    label: "Open RFIs + Overdue",
    icon: MessageSquareWarning,
    href: "/rfis",
    format: (k) => `${k.openRfis} / ${k.overdueRfis}`,
    warn: (k) => k.overdueRfis > 0,
  },
  {
    key: "fabPct",
    label: "Fab % Complete",
    icon: Hammer,
    href: "/fabrication",
    format: (k) => `${k.fabPct}%`,
  },
  {
    key: "installPct",
    label: "Install % Complete",
    icon: HardHat,
    href: "/installation",
    format: (k) => `${k.installPct}%`,
  },
  {
    key: "totalOverdue",
    label: "Total Overdue",
    icon: AlertTriangle,
    href: "/lookahead-48h",
    format: (k) => String(k.totalOverdue),
    warn: (k) => k.totalOverdue > 0,
  },
  {
    key: "onTimeDeliveryPct",
    label: "On-time Delivery %",
    icon: Truck,
    href: "/delivery",
    format: (k) => `${k.onTimeDeliveryPct}%`,
  },
  {
    key: "pendingCoValue",
    label: "Pending CO Value",
    icon: CircleDollarSign,
    href: "/changes",
    format: (k) => formatCurrency(k.pendingCoValue),
  },
  {
    key: "dueCombo",
    label: "Items due 48h / 10d",
    icon: CalendarClock,
    href: "/lookahead-48h",
    format: (k) => `${k.due48h} / ${k.due10d}`,
  },
];

export function KpiBoard({ kpi }: { kpi: KpiSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((c) => {
        const Icon = c.icon;
        const warn = c.warn?.(kpi);
        return (
          <Link
            key={c.label}
            to={c.href}
            className={cn(
              "group rounded-xl border border-border bg-surface p-4 transition-colors duration-150",
              "hover:border-primary/40 hover:bg-surface-2",
              warn && "border-status-red/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
                {c.label}
              </span>
              <Icon
                className={cn(
                  "size-4 shrink-0 text-accent-steel",
                  warn && "text-status-red",
                )}
                strokeWidth={1.75}
              />
            </div>
            <div
              className={cn(
                "mt-3 text-2xl font-semibold tracking-tight tabular",
                warn ? "text-status-red" : "text-fg",
              )}
            >
              {c.format(kpi)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
