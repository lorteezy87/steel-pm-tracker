import type { LookaheadEntityType } from "./types";
import type { usePmStore } from "./store";

type Store = ReturnType<typeof usePmStore.getState>;

/**
 * Push a record's driving date. Each tracker keeps its date under a different
 * field — the "due" column the Today/Lookahead views show is whichever one
 * `buildLookahead` pulled — so this maps back to the right one per entity.
 *
 * Drawing sheets and roadblocks are deliberately included: a sheet slips with
 * its own `requiredBy`, and a roadblock's `resolvedDate` is its target-to-clear
 * date, which is what the Today view surfaces for it.
 */
export function rescheduleEntity(
  store: Pick<
    Store,
    | "updateDrawingSet"
    | "updateDrawingSheet"
    | "updateFab"
    | "updateDelivery"
    | "updateInstall"
    | "updateRfi"
    | "updateTask"
    | "updateWorkPackage"
    | "updateRoadblock"
    | "updateSubmittal"
    | "updateCo"
  >,
  entityType: LookaheadEntityType,
  entityId: string,
  iso: string,
): void {
  switch (entityType) {
    case "drawingSet":
      store.updateDrawingSet(entityId, { requiredBy: iso });
      break;
    case "drawingSheet":
      store.updateDrawingSheet(entityId, { requiredBy: iso });
      break;
    case "fab":
      store.updateFab(entityId, { plannedDate: iso });
      break;
    case "delivery":
      store.updateDelivery(entityId, { plannedShip: iso });
      break;
    case "install":
      store.updateInstall(entityId, { plannedErect: iso });
      break;
    case "rfi":
      store.updateRfi(entityId, { responseDue: iso });
      break;
    case "task":
      store.updateTask(entityId, { due: iso });
      break;
    case "workPackage":
      store.updateWorkPackage(entityId, { plannedComplete: iso });
      break;
    case "roadblock":
      store.updateRoadblock(entityId, { resolvedDate: iso });
      break;
    case "submittal":
      store.updateSubmittal(entityId, { dueBack: iso });
      break;
    case "changeOrder":
      store.updateCo(entityId, { decisionDue: iso });
      break;
  }
}
