import { create, type StoreApi } from "zustand";
import { persist } from "zustand/middleware";
import {
  changeOrdersApi,
  deliveriesApi,
  drawingSetsApi,
  drawingSheetsApi,
  fabItemsApi,
  installItemsApi,
  projectsApi,
  rfisApi,
  roadblocksApi,
  tasksApi,
  workPackagesApi,
} from "./api";
import type { EntityMutationApi } from "./api/client-mutations";
import { optimisticDelete, optimisticUpdate, persistCreate } from "./api/client-mutations";
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

/**
 * Registry of in-flight `create` server calls, keyed by the client-generated
 * id. Lets a dependent child row (e.g. a drawing sheet created immediately
 * after its parent set, from `bulk-drawing-upload.tsx`) `await` the parent's
 * server-side insert before its own insert fires, so the FK constraint never
 * races a not-yet-committed parent row.
 */
const pendingCreates = new Map<string, Promise<unknown>>();

/** Let a dependent row's create wait for a possibly-still-in-flight parent create. */
export async function awaitPendingCreate(id: string): Promise<void> {
  await pendingCreates.get(id);
}

/**
 * Builds `add`/`update`/`delete` actions for one entity slice that make REAL,
 * immediate per-record server calls (via `client-mutations.ts`) instead of a
 * debounced whole-snapshot replace. Each action still applies its change to
 * local Zustand state synchronously first (optimistic UI, and so `add`
 * keeps returning the new id synchronously for callers like
 * `bulk-drawing-upload.tsx` that need it right away to link child rows).
 */
function crudActions<K extends keyof PmState, T extends { id: string }>(
  set: StoreApi<PmState>["setState"],
  get: StoreApi<PmState>["getState"],
  key: K,
  idPrefix: string,
  api: EntityMutationApi<T>,
) {
  type Row = T;
  const getRows = () => get()[key] as unknown as Row[];
  const setRows = (rows: Row[]) => set({ [key]: rows } as unknown as Partial<PmState>);

  return {
    add: (row: Omit<Row, "id">): string => {
      const id = newId(idPrefix);
      const full = { ...row, id } as Row;
      // If this row references a parent created moments ago (e.g. a drawing
      // sheet's `setId` right after `addDrawingSet`, from
      // bulk-drawing-upload.tsx), wait for that parent's own server insert to
      // land first so this row's FK never races an uncommitted parent.
      const parentIds = [
        (full as Record<string, unknown>).setId,
        (full as Record<string, unknown>).projectId,
        (full as Record<string, unknown>).workPackageId,
      ].filter((v): v is string => typeof v === "string" && v.length > 0);
      // Apply the optimistic insert synchronously so the UI (and the
      // return-id contract every caller relies on) updates immediately.
      setRows([...getRows(), full]);
      const promise = Promise.all(parentIds.map(awaitPendingCreate)).then(() =>
        persistCreate<Row>(
          api,
          full,
          (saved) => setRows([...getRows().filter((r) => r.id !== saved.id), saved]),
          (removedId) => setRows(getRows().filter((r) => r.id !== removedId)),
        ),
      );
      pendingCreates.set(id, promise);
      void promise.finally(() => {
        if (pendingCreates.get(id) === promise) pendingCreates.delete(id);
      });
      return id;
    },
    update: (id: string, patch: Partial<Row>): void => {
      const previousRow = getRows().find((r) => r.id === id);
      const previous: Partial<Row> = previousRow
        ? (Object.fromEntries(
            Object.keys(patch).map((k) => [k, (previousRow as Record<string, unknown>)[k]]),
          ) as Partial<Row>)
        : {};
      void optimisticUpdate<Row>(api, id, patch, previous, (rowId, p) =>
        setRows(getRows().map((r) => (r.id === rowId ? { ...r, ...p } : r))),
      );
    },
    remove: (id: string): void => {
      const row = getRows().find((r) => r.id === id);
      if (!row) return;
      void optimisticDelete<Row>(
        api,
        id,
        (removedId) => setRows(getRows().filter((r) => r.id !== removedId)),
        (restored) => setRows([...getRows(), restored]),
        row,
      );
    },
  };
}

export const usePmStore = create<PmState>()(
  persist(
    (set, get) => {
      const project = crudActions<"projects", Project>(set, get, "projects", "p", projectsApi);
      const workPackage = crudActions<"workPackages", WorkPackage>(
        set,
        get,
        "workPackages",
        "wp",
        workPackagesApi,
      );
      const drawingSet = crudActions<"drawingSets", DrawingSet>(
        set,
        get,
        "drawingSets",
        "ds",
        drawingSetsApi,
      );
      const drawingSheet = crudActions<"drawingSheets", DrawingSheet>(
        set,
        get,
        "drawingSheets",
        "sh",
        drawingSheetsApi,
      );
      const fab = crudActions<"fab", FabItem>(set, get, "fab", "f", fabItemsApi);
      const delivery = crudActions<"deliveries", Delivery>(
        set,
        get,
        "deliveries",
        "dl",
        deliveriesApi,
      );
      const install = crudActions<"install", InstallItem>(
        set,
        get,
        "install",
        "i",
        installItemsApi,
      );
      const rfi = crudActions<"rfis", Rfi>(set, get, "rfis", "r", rfisApi);
      const co = crudActions<"cos", ChangeOrder>(set, get, "cos", "c", changeOrdersApi);
      const task = crudActions<"tasks", Task>(set, get, "tasks", "t", tasksApi);
      const roadblock = crudActions<"roadblocks", Roadblock>(
        set,
        get,
        "roadblocks",
        "rb",
        roadblocksApi,
      );

      return {
        ...initial,
        setFilterProjectId: (id) => set({ filterProjectId: id }),

        addProject: (row) => project.add(row),
        updateProject: (id, patch) => project.update(id, patch),
        deleteProject: (id) => {
          // Cascade locally so dependent rows disappear immediately; each
          // server-side delete is its own real per-record call (`on delete
          // cascade` FKs also clean these up server-side regardless).
          const s = get();
          const drawingSetIds = new Set(
            s.drawingSets.filter((r) => r.projectId === id).map((r) => r.id),
          );
          set((st) => ({
            drawingSheets: st.drawingSheets.filter((sh) => !drawingSetIds.has(sh.setId)),
          }));
          for (const ds of s.drawingSets.filter((r) => r.projectId === id)) {
            for (const sh of s.drawingSheets.filter((r) => r.setId === ds.id)) {
              drawingSheet.remove(sh.id);
            }
            drawingSet.remove(ds.id);
          }
          for (const r of s.workPackages.filter((r) => r.projectId === id)) workPackage.remove(r.id);
          for (const r of s.fab.filter((r) => r.projectId === id)) fab.remove(r.id);
          for (const r of s.deliveries.filter((r) => r.projectId === id)) delivery.remove(r.id);
          for (const r of s.install.filter((r) => r.projectId === id)) install.remove(r.id);
          for (const r of s.rfis.filter((r) => r.projectId === id)) rfi.remove(r.id);
          for (const r of s.cos.filter((r) => r.projectId === id)) co.remove(r.id);
          for (const r of s.roadblocks.filter((r) => r.projectId === id)) roadblock.remove(r.id);
          for (const r of s.tasks.filter((r) => r.projectId === id)) task.remove(r.id);
          project.remove(id);
          set((st) => ({
            filterProjectId: st.filterProjectId === id ? "all" : st.filterProjectId,
          }));
        },

        addWorkPackage: (row) => workPackage.add(row),
        updateWorkPackage: (id, patch) => workPackage.update(id, patch),
        deleteWorkPackage: (id) => {
          // Unlink (not delete) dependents that merely reference this work
          // package, same as before \u2014 each unlink is a real per-record update.
          const s = get();
          for (const r of s.fab.filter((r) => r.workPackageId === id)) {
            fab.update(r.id, { workPackageId: undefined } as Partial<FabItem>);
          }
          for (const r of s.deliveries.filter((r) => r.workPackageId === id)) {
            delivery.update(r.id, { workPackageId: undefined } as Partial<Delivery>);
          }
          for (const r of s.install.filter((r) => r.workPackageId === id)) {
            install.update(r.id, { workPackageId: undefined } as Partial<InstallItem>);
          }
          workPackage.remove(id);
        },

        addDrawingSet: (row) => drawingSet.add(row),
        updateDrawingSet: (id, patch) => drawingSet.update(id, patch),
        deleteDrawingSet: (id) => {
          const s = get();
          for (const sh of s.drawingSheets.filter((r) => r.setId === id)) drawingSheet.remove(sh.id);
          drawingSet.remove(id);
        },

        addDrawingSheet: (row) => drawingSheet.add(row),
        updateDrawingSheet: (id, patch) => drawingSheet.update(id, patch),
        deleteDrawingSheet: (id) => drawingSheet.remove(id),

        addFab: (row) => fab.add(row),
        updateFab: (id, patch) => fab.update(id, patch),
        deleteFab: (id) => fab.remove(id),

        addDelivery: (row) => delivery.add(row),
        updateDelivery: (id, patch) => delivery.update(id, patch),
        deleteDelivery: (id) => delivery.remove(id),

        addInstall: (row) => install.add(row),
        updateInstall: (id, patch) => install.update(id, patch),
        deleteInstall: (id) => install.remove(id),

        addRfi: (row) => rfi.add(row),
        updateRfi: (id, patch) => rfi.update(id, patch),
        deleteRfi: (id) => rfi.remove(id),

        addCo: (row) => co.add(row),
        updateCo: (id, patch) => co.update(id, patch),
        deleteCo: (id) => co.remove(id),

        addTask: (row) => task.add(row),
        updateTask: (id, patch) => task.update(id, patch),
        deleteTask: (id) => task.remove(id),

        addRoadblock: (row) => roadblock.add(row),
        updateRoadblock: (id, patch) => roadblock.update(id, patch),
        deleteRoadblock: (id) => roadblock.remove(id),

        resetSeed: () => set({ ...initial }),
      };
    },
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
