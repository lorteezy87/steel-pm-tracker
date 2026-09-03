import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isDoneStatus } from "./complete";
import { newId } from "./id";
import {
  SEED_COS,
  SEED_DELIVERY,
  SEED_DRAWING_SETS,
  SEED_DRAWING_SHEETS,
  SEED_FAB,
  SEED_INSTALL,
  SEED_PROJECTS,
  SEED_RFIS,
  SEED_ROADBLOCKS,
  SEED_TASKS,
  SEED_WORK_PACKAGES,
} from "./seed";
import type {
  ChangeOrder,
  Delivery,
  DrawingSet,
  DrawingSheet,
  FabItem,
  InstallItem,
  KpiSnapshot,
  LookaheadItem,
  Priority,
  Project,
  Rfi,
  Roadblock,
  Task,
  TrackerName,
  WorkPackage,
} from "./types";

/** Fixed "today" for demo lookaheads so sample dates stay relevant (2026-08-03). */
export const DEMO_TODAY = "2026-08-03";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function priorityRank(p: Priority): number {
  return p === "High" ? 0 : p === "Med" ? 1 : 2;
}

interface PmState {
  projects: Project[];
  workPackages: WorkPackage[];
  drawingSets: DrawingSet[];
  drawingSheets: DrawingSheet[];
  fab: FabItem[];
  deliveries: Delivery[];
  install: InstallItem[];
  rfis: Rfi[];
  cos: ChangeOrder[];
  roadblocks: Roadblock[];
  tasks: Task[];
  filterProjectId: string | "all";
  setFilterProjectId: (id: string | "all") => void;

  addProject: (row: Omit<Project, "id">) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addWorkPackage: (row: Omit<WorkPackage, "id">) => string;
  updateWorkPackage: (id: string, patch: Partial<WorkPackage>) => void;
  deleteWorkPackage: (id: string) => void;

  addDrawingSet: (row: Omit<DrawingSet, "id">) => string;
  updateDrawingSet: (id: string, patch: Partial<DrawingSet>) => void;
  deleteDrawingSet: (id: string) => void;

  addDrawingSheet: (row: Omit<DrawingSheet, "id">) => string;
  updateDrawingSheet: (id: string, patch: Partial<DrawingSheet>) => void;
  deleteDrawingSheet: (id: string) => void;

  addFab: (row: Omit<FabItem, "id">) => string;
  updateFab: (id: string, patch: Partial<FabItem>) => void;
  deleteFab: (id: string) => void;

  addDelivery: (row: Omit<Delivery, "id">) => string;
  updateDelivery: (id: string, patch: Partial<Delivery>) => void;
  deleteDelivery: (id: string) => void;

  addInstall: (row: Omit<InstallItem, "id">) => string;
  updateInstall: (id: string, patch: Partial<InstallItem>) => void;
  deleteInstall: (id: string) => void;

  addRfi: (row: Omit<Rfi, "id">) => string;
  updateRfi: (id: string, patch: Partial<Rfi>) => void;
  deleteRfi: (id: string) => void;

  addCo: (row: Omit<ChangeOrder, "id">) => string;
  updateCo: (id: string, patch: Partial<ChangeOrder>) => void;
  deleteCo: (id: string) => void;

  addTask: (row: Omit<Task, "id">) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;

  addRoadblock: (row: Omit<Roadblock, "id">) => string;
  updateRoadblock: (id: string, patch: Partial<Roadblock>) => void;
  deleteRoadblock: (id: string) => void;

  resetSeed: () => void;
}

const initial = {
  projects: SEED_PROJECTS,
  workPackages: SEED_WORK_PACKAGES,
  drawingSets: SEED_DRAWING_SETS,
  drawingSheets: SEED_DRAWING_SHEETS,
  fab: SEED_FAB,
  deliveries: SEED_DELIVERY,
  install: SEED_INSTALL,
  rfis: SEED_RFIS,
  cos: SEED_COS,
  roadblocks: SEED_ROADBLOCKS,
  tasks: SEED_TASKS,
  filterProjectId: "all" as const,
};

export const usePmStore = create<PmState>()(
  persist(
    (set) => ({
      ...initial,
      setFilterProjectId: (id) => set({ filterProjectId: id }),

      addProject: (row) => {
        const id = newId("p");
        set((s) => ({ projects: [...s.projects, { ...row, id }] }));
        return id;
      },
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((r) => r.id !== id),
          workPackages: s.workPackages.filter((r) => r.projectId !== id),
          drawingSets: s.drawingSets.filter((r) => r.projectId !== id),
          drawingSheets: s.drawingSheets.filter((sh) => {
            const set = s.drawingSets.find((ds) => ds.id === sh.setId);
            return set?.projectId !== id;
          }),
          fab: s.fab.filter((r) => r.projectId !== id),
          deliveries: s.deliveries.filter((r) => r.projectId !== id),
          install: s.install.filter((r) => r.projectId !== id),
          rfis: s.rfis.filter((r) => r.projectId !== id),
          cos: s.cos.filter((r) => r.projectId !== id),
          roadblocks: s.roadblocks.filter((r) => r.projectId !== id),
          tasks: s.tasks.filter((r) => r.projectId !== id),
          filterProjectId: s.filterProjectId === id ? "all" : s.filterProjectId,
        })),

      addWorkPackage: (row) => {
        const id = newId("wp");
        set((s) => ({ workPackages: [...s.workPackages, { ...row, id }] }));
        return id;
      },
      updateWorkPackage: (id, patch) =>
        set((s) => ({
          workPackages: s.workPackages.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteWorkPackage: (id) =>
        set((s) => ({
          workPackages: s.workPackages.filter((r) => r.id !== id),
          fab: s.fab.map((r) => (r.workPackageId === id ? { ...r, workPackageId: undefined } : r)),
          deliveries: s.deliveries.map((r) =>
            r.workPackageId === id ? { ...r, workPackageId: undefined } : r,
          ),
          install: s.install.map((r) =>
            r.workPackageId === id ? { ...r, workPackageId: undefined } : r,
          ),
        })),

      addDrawingSet: (row) => {
        const id = newId("ds");
        set((s) => ({ drawingSets: [...s.drawingSets, { ...row, id }] }));
        return id;
      },
      updateDrawingSet: (id, patch) =>
        set((s) => ({
          drawingSets: s.drawingSets.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteDrawingSet: (id) =>
        set((s) => ({
          drawingSets: s.drawingSets.filter((r) => r.id !== id),
          drawingSheets: s.drawingSheets.filter((r) => r.setId !== id),
        })),

      addDrawingSheet: (row) => {
        const id = newId("sh");
        set((s) => ({ drawingSheets: [...s.drawingSheets, { ...row, id }] }));
        return id;
      },
      updateDrawingSheet: (id, patch) =>
        set((s) => ({
          drawingSheets: s.drawingSheets.map((r) =>
            r.id === id ? { ...r, ...patch } : r,
          ),
        })),
      deleteDrawingSheet: (id) =>
        set((s) => ({
          drawingSheets: s.drawingSheets.filter((r) => r.id !== id),
        })),

      addFab: (row) => {
        const id = newId("f");
        set((s) => ({ fab: [...s.fab, { ...row, id }] }));
        return id;
      },
      updateFab: (id, patch) =>
        set((s) => ({
          fab: s.fab.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteFab: (id) => set((s) => ({ fab: s.fab.filter((r) => r.id !== id) })),

      addDelivery: (row) => {
        const id = newId("dl");
        set((s) => ({ deliveries: [...s.deliveries, { ...row, id }] }));
        return id;
      },
      updateDelivery: (id, patch) =>
        set((s) => ({
          deliveries: s.deliveries.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteDelivery: (id) =>
        set((s) => ({ deliveries: s.deliveries.filter((r) => r.id !== id) })),

      addInstall: (row) => {
        const id = newId("i");
        set((s) => ({ install: [...s.install, { ...row, id }] }));
        return id;
      },
      updateInstall: (id, patch) =>
        set((s) => ({
          install: s.install.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteInstall: (id) =>
        set((s) => ({ install: s.install.filter((r) => r.id !== id) })),

      addRfi: (row) => {
        const id = newId("r");
        set((s) => ({ rfis: [...s.rfis, { ...row, id }] }));
        return id;
      },
      updateRfi: (id, patch) =>
        set((s) => ({
          rfis: s.rfis.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteRfi: (id) => set((s) => ({ rfis: s.rfis.filter((r) => r.id !== id) })),

      addCo: (row) => {
        const id = newId("c");
        set((s) => ({ cos: [...s.cos, { ...row, id }] }));
        return id;
      },
      updateCo: (id, patch) =>
        set((s) => ({
          cos: s.cos.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteCo: (id) => set((s) => ({ cos: s.cos.filter((r) => r.id !== id) })),

      addTask: (row) => {
        const id = newId("t");
        set((s) => ({ tasks: [...s.tasks, { ...row, id }] }));
        return id;
      },
      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((r) => r.id !== id) })),

      addRoadblock: (row) => {
        const id = newId("rb");
        set((s) => ({ roadblocks: [...s.roadblocks, { ...row, id }] }));
        return id;
      },
      updateRoadblock: (id, patch) =>
        set((s) => ({
          roadblocks: s.roadblocks.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      deleteRoadblock: (id) =>
        set((s) => ({ roadblocks: s.roadblocks.filter((r) => r.id !== id) })),

      resetSeed: () => set({ ...initial }),
    }),
    { name: "steel-pm-tracker-v6" },
  ),
);

export function projectCode(projects: Project[], id: string): string {
  return projects.find((p) => p.id === id)?.code ?? id;
}

export function computeKpis(state: {
  projects: Project[];
  workPackages: WorkPackage[];
  drawingSets: DrawingSet[];
  drawingSheets: DrawingSheet[];
  fab: FabItem[];
  deliveries: Delivery[];
  install: InstallItem[];
  rfis: Rfi[];
  cos: ChangeOrder[];
  roadblocks: Roadblock[];
  tasks: Task[];
}): KpiSnapshot {
  const today = DEMO_TODAY;
  const end48 = addDays(today, 2);
  const end10 = addDays(today, 10);

  const activeProjects = state.projects.filter((p) => p.status === "Active").length;
  const openRfis = state.rfis.filter((r) => r.status === "Open").length;
  const overdueRfis = state.rfis.filter(
    (r) => r.status === "Open" && r.responseDue && r.responseDue < today,
  ).length;

  const fabPct =
    state.fab.length === 0
      ? 0
      : Math.round(state.fab.reduce((a, f) => a + f.pctComplete, 0) / state.fab.length);
  const installPct =
    state.install.length === 0
      ? 0
      : Math.round(
          state.install.reduce((a, i) => a + i.pctComplete, 0) / state.install.length,
        );

  const overdueItems = buildLookahead(state, "2099-12-31").filter(
    (i) => i.due && i.due < today && !isDoneStatus(i.status),
  );

  const delivered = state.deliveries.filter(
    (d) => d.status === "Delivered" || d.status === "Verified",
  );
  const onTime = delivered.filter(
    (d) =>
      !d.actualArrival || !d.plannedArrival || d.actualArrival <= d.plannedArrival,
  );
  const onTimeDeliveryPct =
    delivered.length === 0
      ? 100
      : Math.round((onTime.length / delivered.length) * 100);

  const pendingCoValue = state.cos
    .filter((c) => ["Draft", "Submitted", "Under Review"].includes(c.status))
    .reduce((a, c) => a + c.cost, 0);

  const openRoadblocks = state.roadblocks.filter((r) => r.status === "Open").length;
  const overdueRoadblocks = state.roadblocks.filter(
    (r) => r.status === "Open" && r.resolvedDate && r.resolvedDate < today,
  ).length;

  const la = buildLookahead(state, end10);
  const due48h = la.filter((i) => i.due <= end48 && !isDoneStatus(i.status)).length;
  const due10d = la.filter((i) => !isDoneStatus(i.status)).length;

  return {
    activeProjects,
    openRfis,
    overdueRfis,
    fabPct,
    installPct,
    totalOverdue: overdueItems.length,
    onTimeDeliveryPct,
    pendingCoValue,
    due48h,
    due10d,
    openRoadblocks,
    overdueRoadblocks,
  };
}

export function buildLookahead(
  state: {
    projects: Project[];
    workPackages: WorkPackage[];
    drawingSets: DrawingSet[];
    drawingSheets: DrawingSheet[];
    fab: FabItem[];
    deliveries: Delivery[];
    install: InstallItem[];
    rfis: Rfi[];
    cos: ChangeOrder[];
    roadblocks: Roadblock[];
    tasks: Task[];
  },
  until: string,
): LookaheadItem[] {
  const items: LookaheadItem[] = [];
  const code = (id: string) => projectCode(state.projects, id);
  const today = DEMO_TODAY;
  const setById = new Map(state.drawingSets.map((s) => [s.id, s]));

  for (const set of state.drawingSets) {
    if (!set.requiredBy || set.requiredBy > until) continue;
    items.push({
      projectCode: code(set.projectId),
      tracker: "Drawings",
      id: set.name,
      description: `Set · ${set.description || set.type}`,
      owner: set.owner,
      due: set.requiredBy,
      status: set.status,
      priority: set.requiredBy < today ? "High" : "Med",
      action: set.status === "Not Submitted" ? "Submit set" : "Follow set review",
      entityType: "drawingSet",
      entityId: set.id,
    });
  }

  for (const sh of state.drawingSheets) {
    if (!sh.requiredBy || sh.requiredBy > until) continue;
    const ds = setById.get(sh.setId);
    if (!ds) continue;
    if (sh.requiredBy === ds.requiredBy && sh.status === ds.status) continue;
    items.push({
      projectCode: code(ds.projectId),
      tracker: "Drawings",
      id: sh.numberRev,
      description: `${ds.name} · ${sh.description}`,
      owner: sh.ballInCourt || ds.owner,
      due: sh.requiredBy,
      status: sh.status,
      priority: sh.requiredBy < today ? "High" : "Med",
      action: sh.status === "Not Submitted" ? "Submit sheet" : "Chase sheet",
      entityType: "drawingSheet",
      entityId: sh.id,
    });
  }

  for (const f of state.fab) {
    if (!f.plannedDate || f.plannedDate > until) continue;
    items.push({
      projectCode: code(f.projectId),
      tracker: "Fabrication",
      id: f.workPackage,
      description: `${f.description} · ${f.qty} pcs · ${f.weightTons}t`,
      owner: f.owner,
      due: f.plannedDate,
      status: f.status,
      priority: f.pctComplete < 50 ? "High" : "Med",
      action: "Advance WP status",
      entityType: "fab",
      entityId: f.id,
    });
  }
  for (const d of state.deliveries) {
    if (!d.plannedShip || d.plannedShip > until) continue;
    items.push({
      projectCode: code(d.projectId),
      tracker: "Delivery",
      id: d.loadNumber,
      description: `Ship ${d.pieceMarks}`,
      owner: d.owner,
      due: d.plannedShip,
      status: d.status,
      priority: "High",
      action: "Confirm truck",
      entityType: "delivery",
      entityId: d.id,
    });
  }
  for (const i of state.install) {
    if (!i.plannedErect || i.plannedErect > until) continue;
    items.push({
      projectCode: code(i.projectId),
      tracker: "Installation",
      id: i.sequenceArea,
      description: `Erect ${i.pieceMarks}`,
      owner: i.owner,
      due: i.plannedErect,
      status: i.status,
      priority: "Med",
      action: "Stage / erect",
      entityType: "install",
      entityId: i.id,
    });
  }
  for (const r of state.rfis) {
    if (!r.responseDue || r.responseDue > until) continue;
    items.push({
      projectCode: code(r.projectId),
      tracker: "RFIs",
      id: r.rfiNumber,
      description: r.subject,
      owner: r.ballInCourt,
      due: r.responseDue,
      status: r.status,
      priority: r.status === "Open" ? "High" : "Low",
      action: r.status === "Open" ? "Chase response" : "Close out",
      entityType: "rfi",
      entityId: r.id,
    });
  }
  for (const t of state.tasks) {
    if (!t.due || t.due > until) continue;
    items.push({
      projectCode: code(t.projectId),
      tracker: "Tasks",
      id: t.category,
      description: t.task,
      owner: t.owner,
      due: t.due,
      status: t.status,
      priority: t.priority,
      action: "Complete task",
      entityType: "task",
      entityId: t.id,
    });
  }

  for (const wp of state.workPackages) {
    const dueDate = wp.plannedComplete || wp.plannedStart;
    if (!dueDate || dueDate > until) continue;
    items.push({
      projectCode: code(wp.projectId),
      tracker: "Work Packages",
      id: wp.code,
      description: `${wp.name || wp.description} · ${wp.tonnage}t`,
      owner: wp.owner,
      due: dueDate,
      status: wp.status,
      priority: dueDate < today ? "High" : "Med",
      action: wp.plannedComplete && wp.plannedComplete <= until ? "Confirm complete" : "Confirm start",
      entityType: "workPackage",
      entityId: wp.id,
    });
  }

  // Roadblocks have no hard due date by nature — use resolvedDate as a target
  // when set, otherwise still surface every OPEN roadblock as needing
  // attention (flagged "no target date") since they block other work.
  for (const rb of state.roadblocks) {
    if (rb.status !== "Open") continue;
    const hasTarget = Boolean(rb.resolvedDate);
    if (hasTarget && rb.resolvedDate > until) continue;
    items.push({
      projectCode: code(rb.projectId),
      tracker: "Roadblocks",
      id: rb.title,
      description: hasTarget ? rb.description : `${rb.description} · no target date`,
      owner: rb.ballInCourt || rb.owner,
      due: hasTarget ? rb.resolvedDate : today,
      status: rb.status,
      priority: rb.severity,
      action: "Clear roadblock",
      entityType: "roadblock",
      entityId: rb.id,
    });
  }

  return items.sort((a, b) => {
    if (a.due !== b.due) return a.due.localeCompare(b.due);
    return priorityRank(a.priority) - priorityRank(b.priority);
  });
}

export function filterByProject<T extends { projectId: string }>(
  rows: T[],
  filterProjectId: string | "all",
): T[] {
  if (filterProjectId === "all") return rows;
  return rows.filter((r) => r.projectId === filterProjectId);
}

export type { TrackerName };
