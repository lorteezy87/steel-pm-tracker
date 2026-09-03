/**
 * Thin per-entity API surface, adapting each entity's `createServerFn`s
 * (list/create/update/delete) to the `EntityMutationApi` shape that
 * `client-mutations.ts` / `store.ts` call. This is the ONE place `store.ts`
 * reaches into the server \u2014 every tracker mutation flows through here as an
 * immediate, real per-record write (no whole-table replace).
 */
import type {
  ChangeOrder,
  Delivery,
  DrawingSet,
  DrawingSheet,
  FabItem,
  InstallItem,
  Project,
  Rfi,
  Roadblock,
  Task,
  WorkPackage,
} from "@/lib/pm/types";
import type { EntityMutationApi } from "./client-mutations";
import { createProject, deleteProjectRow, updateProjectRow } from "./projects";
import { createWorkPackage, deleteWorkPackage, updateWorkPackage } from "./work-packages";
import { createDrawingSet, deleteDrawingSet, updateDrawingSet } from "./drawing-sets";
import { createDrawingSheet, deleteDrawingSheet, updateDrawingSheet } from "./drawing-sheets";
import { createFabItem, deleteFabItem, updateFabItem } from "./fab-items";
import { createDelivery, deleteDelivery, updateDelivery } from "./deliveries";
import { createInstallItem, deleteInstallItem, updateInstallItem } from "./install-items";
import { createRfi, deleteRfi, updateRfi } from "./rfis";
import { createChangeOrder, deleteChangeOrder, updateChangeOrder } from "./change-orders";
import { createRoadblock, deleteRoadblock, updateRoadblock } from "./roadblocks";
import { createTask, deleteTask, updateTask } from "./tasks";

/** Adapts a {create,update,delete}ServerFn triplet to `EntityMutationApi`. */
function api<T extends { id: string }>(fns: {
  create: (opts: { data: Omit<T, "id"> & { id: string } }) => Promise<T>;
  update: (opts: { data: { id: string; patch: Partial<T> } }) => Promise<T | null>;
  remove: (opts: { data: { id: string } }) => Promise<{ ok: true }>;
}): EntityMutationApi<T> {
  return {
    create: (row) => fns.create({ data: row }),
    update: (input) => fns.update({ data: input }),
    remove: (input) => fns.remove({ data: input }),
  };
}

export const projectsApi = api<Project>({
  create: createProject,
  update: updateProjectRow,
  remove: deleteProjectRow,
});

export const workPackagesApi = api<WorkPackage>({
  create: createWorkPackage,
  update: updateWorkPackage,
  remove: deleteWorkPackage,
});

export const drawingSetsApi = api<DrawingSet>({
  create: createDrawingSet,
  update: updateDrawingSet,
  remove: deleteDrawingSet,
});

export const drawingSheetsApi = api<DrawingSheet>({
  create: createDrawingSheet,
  update: updateDrawingSheet,
  remove: deleteDrawingSheet,
});

export const fabItemsApi = api<FabItem>({
  create: createFabItem,
  update: updateFabItem,
  remove: deleteFabItem,
});

export const deliveriesApi = api<Delivery>({
  create: createDelivery,
  update: updateDelivery,
  remove: deleteDelivery,
});

export const installItemsApi = api<InstallItem>({
  create: createInstallItem,
  update: updateInstallItem,
  remove: deleteInstallItem,
});

export const rfisApi = api<Rfi>({
  create: createRfi,
  update: updateRfi,
  remove: deleteRfi,
});

export const changeOrdersApi = api<ChangeOrder>({
  create: createChangeOrder,
  update: updateChangeOrder,
  remove: deleteChangeOrder,
});

export const roadblocksApi = api<Roadblock>({
  create: createRoadblock,
  update: updateRoadblock,
  remove: deleteRoadblock,
});

export const tasksApi = api<Task>({
  create: createTask,
  update: updateTask,
  remove: deleteTask,
});
