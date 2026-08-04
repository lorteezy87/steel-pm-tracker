import { isDoneStatus } from "./complete";
import type {
  ChangeOrder,
  Delivery,
  DrawingSet,
  DrawingSheet,
  FabItem,
  InstallItem,
  Project,
  Rfi,
  Task,
  TrackerName,
} from "./types";

export type CalendarEventKind =
  | "due"
  | "planned"
  | "ship"
  | "arrival"
  | "erect"
  | "issued";

export type CalendarEntityType =
  | "drawingSet"
  | "drawingSheet"
  | "fab"
  | "delivery"
  | "install"
  | "rfi"
  | "task";

export interface CalendarEvent {
  id: string;
  date: string;
  projectId: string;
  projectCode: string;
  tracker: TrackerName;
  kind: CalendarEventKind;
  title: string;
  subtitle: string;
  status: string;
  owner: string;
  href: string;
  entityType: CalendarEntityType;
  entityId: string;
}

export const TRACKER_FILTERS: TrackerName[] = [
  "Drawings",
  "Fabrication",
  "Delivery",
  "Installation",
  "RFIs",
  "Change Orders",
  "Tasks",
];

function codeOf(projects: Project[], id: string): string {
  return projects.find((p) => p.id === id)?.code ?? id;
}

export { isDoneStatus };

export function completeStatusFor(entityType: CalendarEntityType): string {
  switch (entityType) {
    case "drawingSet":
    case "drawingSheet":
      return "Approved";
    case "fab":
      return "Ready to Ship";
    case "delivery":
      return "Delivered";
    case "install":
      return "Complete";
    case "rfi":
      return "Closed";
    case "task":
      return "Complete";
    default:
      return "Complete";
  }
}

export function buildCalendarEvents(state: {
  projects: Project[];
  drawingSets: DrawingSet[];
  drawingSheets: DrawingSheet[];
  fab: FabItem[];
  deliveries: Delivery[];
  install: InstallItem[];
  rfis: Rfi[];
  cos: ChangeOrder[];
  tasks: Task[];
}): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const code = (id: string) => codeOf(state.projects, id);
  const setById = new Map(state.drawingSets.map((s) => [s.id, s]));

  for (const s of state.drawingSets) {
    if (s.requiredBy) {
      events.push({
        id: `dset-req-${s.id}`,
        date: s.requiredBy,
        projectId: s.projectId,
        projectCode: code(s.projectId),
        tracker: "Drawings",
        kind: "due",
        title: s.name,
        subtitle: "Set required by",
        status: s.status,
        owner: s.owner,
        href: "/drawings",
        entityType: "drawingSet",
        entityId: s.id,
      });
    }
    if (s.submitted) {
      events.push({
        id: `dset-sub-${s.id}`,
        date: s.submitted,
        projectId: s.projectId,
        projectCode: code(s.projectId),
        tracker: "Drawings",
        kind: "issued",
        title: s.name,
        subtitle: "Set submitted",
        status: s.status,
        owner: s.owner,
        href: "/drawings",
        entityType: "drawingSet",
        entityId: s.id,
      });
    }
  }

  for (const sh of state.drawingSheets) {
    const set = setById.get(sh.setId);
    if (!set) continue;
    if (sh.requiredBy) {
      events.push({
        id: `dsh-req-${sh.id}`,
        date: sh.requiredBy,
        projectId: set.projectId,
        projectCode: code(set.projectId),
        tracker: "Drawings",
        kind: "due",
        title: sh.numberRev,
        subtitle: `${set.name} · sheet due`,
        status: sh.status,
        owner: sh.ballInCourt || set.owner,
        href: "/drawings",
        entityType: "drawingSheet",
        entityId: sh.id,
      });
    }
  }

  for (const f of state.fab) {
    if (!f.plannedDate) continue;
    events.push({
      id: `fab-${f.id}`,
      date: f.plannedDate,
      projectId: f.projectId,
      projectCode: code(f.projectId),
      tracker: "Fabrication",
      kind: "planned",
      title: f.workPackage,
      subtitle: f.description || "Fab planned",
      status: f.status,
      owner: f.owner,
      href: "/fabrication",
      entityType: "fab",
      entityId: f.id,
    });
  }

  for (const d of state.deliveries) {
    if (d.plannedShip) {
      events.push({
        id: `del-ship-${d.id}`,
        date: d.plannedShip,
        projectId: d.projectId,
        projectCode: code(d.projectId),
        tracker: "Delivery",
        kind: "ship",
        title: d.loadNumber,
        subtitle: `Ship ${d.pieceMarks}`,
        status: d.status,
        owner: d.owner,
        href: "/delivery",
        entityType: "delivery",
        entityId: d.id,
      });
    }
    if (d.plannedArrival) {
      events.push({
        id: `del-arr-${d.id}`,
        date: d.plannedArrival,
        projectId: d.projectId,
        projectCode: code(d.projectId),
        tracker: "Delivery",
        kind: "arrival",
        title: d.loadNumber,
        subtitle: `Arrive ${d.destination || d.pieceMarks}`,
        status: d.status,
        owner: d.owner,
        href: "/delivery",
        entityType: "delivery",
        entityId: d.id,
      });
    }
  }

  for (const i of state.install) {
    if (!i.plannedErect) continue;
    events.push({
      id: `inst-${i.id}`,
      date: i.plannedErect,
      projectId: i.projectId,
      projectCode: code(i.projectId),
      tracker: "Installation",
      kind: "erect",
      title: i.sequenceArea,
      subtitle: `Erect ${i.pieceMarks}`,
      status: i.status,
      owner: i.owner,
      href: "/installation",
      entityType: "install",
      entityId: i.id,
    });
  }

  for (const r of state.rfis) {
    if (r.responseDue) {
      events.push({
        id: `rfi-due-${r.id}`,
        date: r.responseDue,
        projectId: r.projectId,
        projectCode: code(r.projectId),
        tracker: "RFIs",
        kind: "due",
        title: r.rfiNumber,
        subtitle: r.subject,
        status: r.status,
        owner: r.ballInCourt,
        href: "/rfis",
        entityType: "rfi",
        entityId: r.id,
      });
    }
    if (r.issued) {
      events.push({
        id: `rfi-iss-${r.id}`,
        date: r.issued,
        projectId: r.projectId,
        projectCode: code(r.projectId),
        tracker: "RFIs",
        kind: "issued",
        title: r.rfiNumber,
        subtitle: "Issued",
        status: r.status,
        owner: r.ballInCourt,
        href: "/rfis",
        entityType: "rfi",
        entityId: r.id,
      });
    }
  }

  void state.cos;

  for (const t of state.tasks) {
    if (!t.due) continue;
    events.push({
      id: `task-${t.id}`,
      date: t.due,
      projectId: t.projectId,
      projectCode: code(t.projectId),
      tracker: "Tasks",
      kind: "due",
      title: t.task,
      subtitle: t.category || "Task due",
      status: t.status,
      owner: t.owner,
      href: "/tasks",
      entityType: "task",
      entityId: t.id,
    });
  }

  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
  );
}

export function monthMatrix(year: number, monthIndex: number): (Date | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function trackerColor(tracker: TrackerName): string {
  switch (tracker) {
    case "Drawings":
      return "bg-status-blue/25 text-status-blue border-status-blue/30";
    case "Fabrication":
      return "bg-accent-steel/20 text-accent-steel border-accent-steel/30";
    case "Delivery":
      return "bg-primary/20 text-primary border-primary/30";
    case "Installation":
      return "bg-status-yellow/20 text-status-yellow border-status-yellow/30";
    case "RFIs":
      return "bg-status-red/20 text-status-red border-status-red/30";
    case "Change Orders":
      return "bg-status-green/20 text-status-green border-status-green/30";
    case "Tasks":
      return "bg-status-gray/20 text-status-gray border-status-gray/30";
    default:
      return "bg-surface-3 text-muted border-border";
  }
}
